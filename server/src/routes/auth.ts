import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Config } from '../config.js';
import { authenticateLdap, LdapAuthError } from '../providers/ldap.js';
import type { OidcRuntime } from '../providers/oidc.js';
import { authenticateLocal, LocalAuthError } from '../providers/local.js';

const LoginBody = z.object({
  username: z.string().min(1).max(256),
  password: z.string().min(1).max(1024),
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

export function buildAuthRouter(config: Config, oidc?: OidcRuntime): Router {
  const router = Router();

  router.get('/me', (req: Request, res: Response) => {
    if (!req.session.user) return res.status(401).json({ error: 'unauthenticated' });
    return res.json(req.session.user);
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
