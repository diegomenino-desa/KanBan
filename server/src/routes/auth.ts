import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Config } from '../config.js';
import { authenticateLdap, LdapAuthError } from '../providers/ldap.js';
import type { OidcRuntime } from '../providers/oidc.js';
import {
  authenticateLocal,
  LocalAuthError,
  changeLocalUserPassword,
  createLocalUser,
  UserMgmtError,
  adminResetLocalUserPassword,
  deleteLocalUser,
  listLocalUsers,
} from '../providers/local.js';
import { getPreferences, setPreferences } from '../providers/preferences.js';

const LoginBody = z.object({
  username: z.string().min(1).max(256),
  password: z.string().min(1).max(1024),
});

const CreateUserBody = z.object({
  username: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  email: z.string().email().max(256),
  role: z.enum(['Admin', 'Editor', 'Viewer']),
  password: z.string().min(8).max(1024),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(8).max(1024),
});

const AdminResetPasswordBody = z.object({
  newPassword: z.string().min(8).max(1024),
});

const PreferencesBody = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  lang: z.enum(['en', 'es']).optional(),
});

function buildLoginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'too_many_attempts' },
  });
}

function buildPasswordChangeLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'too_many_attempts' },
  });
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) return res.status(401).json({ error: 'unauthenticated' });
  return next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) return res.status(401).json({ error: 'unauthenticated' });
  if (req.session.user.role !== 'Admin') return res.status(403).json({ error: 'forbidden' });
  return next();
}

export function buildAuthRouter(config: Config, oidc?: OidcRuntime): Router {
  const router = Router();

  router.get('/me', (req: Request, res: Response) => {
    if (!req.session.user) return res.status(401).json({ error: 'unauthenticated' });
    return res.json(req.session.user);
  });

  router.get('/me/preferences', requireAuth, async (req: Request, res: Response) => {
    try {
      const prefs = await getPreferences(config.PREFERENCES_STORE_PATH, req.session.user!.id);
      return res.json(prefs);
    } catch (err) {
      console.error('[prefs] read failure:', (err as Error).message);
      return res.status(503).json({ error: 'store_unavailable' });
    }
  });

  router.put('/me/preferences', requireAuth, async (req: Request, res: Response) => {
    const parsed = PreferencesBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    try {
      const prefs = await setPreferences(config.PREFERENCES_STORE_PATH, req.session.user!.id, parsed.data);
      return res.json(prefs);
    } catch (err) {
      console.error('[prefs] write failure:', (err as Error).message);
      return res.status(503).json({ error: 'store_unavailable' });
    }
  });

  router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'logout_failed' });
      res.clearCookie('kanban.sid', { path: '/' });
      return res.status(204).end();
    });
  });

  if (config.mode === 'ldap') {
    router.post('/login', buildLoginLimiter(), async (req: Request, res: Response) => {
      const parsed = LoginBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
      const { username, password } = parsed.data;
      try {
        const user = await authenticateLdap(username, password, config);
        req.session.user = user;
        return res.json(user);
      } catch (err) {
        if (err instanceof LdapAuthError && err.code === 'invalid_credentials') {
          return res.status(401).json({ error: 'invalid_credentials' });
        }
        console.error('[ldap] auth failure:', (err as Error).message);
        return res.status(503).json({ error: 'directory_unavailable' });
      }
    });
  }

  if (config.mode === 'local') {
    router.post('/login', buildLoginLimiter(), async (req: Request, res: Response) => {
      const parsed = LoginBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
      const { username, password } = parsed.data;
      try {
        const user = await authenticateLocal(username, password, config);
        req.session.user = user;
        return res.json(user);
      } catch (err) {
        if (err instanceof LocalAuthError && err.code === 'invalid_credentials') {
          return res.status(401).json({ error: 'invalid_credentials' });
        }
        console.error('[local] auth failure:', (err as Error).message);
        return res.status(503).json({ error: 'store_unavailable' });
      }
    });

    router.get('/users', requireAdmin, async (_req: Request, res: Response) => {
      try {
        const users = await listLocalUsers(config);
        return res.json(users);
      } catch (err) {
        console.error('[local] list users failure:', (err as Error).message);
        return res.status(503).json({ error: 'store_unavailable' });
      }
    });

    router.post('/users', requireAdmin, async (req: Request, res: Response) => {
      const parsed = CreateUserBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
      try {
        const user = await createLocalUser(config, parsed.data);
        return res.status(201).json(user);
      } catch (err) {
        if (err instanceof UserMgmtError && err.code === 'username_taken') {
          return res.status(409).json({ error: 'username_taken' });
        }
        console.error('[local] create user failure:', (err as Error).message);
        return res.status(503).json({ error: 'store_unavailable' });
      }
    });

    router.delete('/users/:id', requireAdmin, async (req: Request, res: Response) => {
      try {
        await deleteLocalUser(config, req.params.id!);
        return res.status(204).end();
      } catch (err) {
        if (err instanceof UserMgmtError && err.code === 'not_found') {
          return res.status(404).json({ error: 'not_found' });
        }
        if (err instanceof UserMgmtError && err.code === 'last_admin') {
          return res.status(409).json({ error: 'last_admin' });
        }
        console.error('[local] delete user failure:', (err as Error).message);
        return res.status(503).json({ error: 'store_unavailable' });
      }
    });

    router.post('/users/:id/password', requireAdmin, async (req: Request, res: Response) => {
      const parsed = AdminResetPasswordBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
      try {
        await adminResetLocalUserPassword(config, req.params.id!, parsed.data.newPassword);
        return res.status(204).end();
      } catch (err) {
        if (err instanceof UserMgmtError && err.code === 'not_found') {
          return res.status(404).json({ error: 'not_found' });
        }
        console.error('[local] admin reset failure:', (err as Error).message);
        return res.status(503).json({ error: 'store_unavailable' });
      }
    });

    router.post('/me/password', requireAuth, buildPasswordChangeLimiter(), async (req: Request, res: Response) => {
      const parsed = ChangePasswordBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
      try {
        await changeLocalUserPassword(config, req.session.user!.id, parsed.data.currentPassword, parsed.data.newPassword);
        return res.status(204).end();
      } catch (err) {
        if (err instanceof UserMgmtError && err.code === 'invalid_password') {
          return res.status(401).json({ error: 'invalid_password' });
        }
        if (err instanceof UserMgmtError && err.code === 'not_found') {
          return res.status(404).json({ error: 'not_found' });
        }
        console.error('[local] change password failure:', (err as Error).message);
        return res.status(503).json({ error: 'store_unavailable' });
      }
    });
  }

  if (config.mode === 'oidc') {
    if (!oidc) throw new Error('OIDC runtime not initialized');

    router.get('/login', (req: Request, res: Response) => {
      const { url, state, nonce, codeVerifier } = oidc.buildAuthRequest();
      req.session.oidcState = state;
      req.session.oidcNonce = nonce;
      req.session.oidcCodeVerifier = codeVerifier;
      return res.redirect(url);
    });

    router.get('/callback', async (req: Request, res: Response) => {
      const state = req.session.oidcState;
      const nonce = req.session.oidcNonce;
      const codeVerifier = req.session.oidcCodeVerifier;
      if (!state || !nonce || !codeVerifier) {
        return res.status(400).send('Missing OIDC session state. Try signing in again.');
      }
      try {
        const user = await oidc.handleCallback({
          url: req.originalUrl,
          state,
          nonce,
          codeVerifier,
        });
        req.session.user = user;
        delete req.session.oidcState;
        delete req.session.oidcNonce;
        delete req.session.oidcCodeVerifier;
        return res.redirect(config.APP_BASE_URL);
      } catch (err) {
        console.error('[oidc] callback failure:', (err as Error).message);
        return res.status(401).send('Sign-in failed. Please try again.');
      }
    });
  }

  return router;
}
