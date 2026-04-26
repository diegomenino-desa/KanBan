import express from 'express';
import cookieParser from 'cookie-parser';
import { loadConfig } from './config.js';
import { buildSessionMiddleware } from './session.js';
import { buildAuthRouter } from './routes/auth.js';
import { buildBoardsRouter } from './routes/boards.js';
import { buildOidcRuntime, type OidcRuntime } from './providers/oidc.js';
import { bootstrapAdminIfEmpty } from './providers/local.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use(buildSessionMiddleware(config));

  // Scrub password from any logged body.
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object' && 'password' in req.body) {
      Object.defineProperty(req.body, '__redacted__', { value: true, enumerable: false });
    }
    next();
  });

  let oidc: OidcRuntime | undefined;
  if (config.mode === 'oidc') {
    oidc = await buildOidcRuntime(config);
  }

  if (config.mode === 'local') {
    await bootstrapAdminIfEmpty(config);
  }

  app.use('/auth', buildAuthRouter(config, oidc));
  app.use('/api/boards', buildBoardsRouter(config));

  app.get('/healthz', (_req, res) => res.json({ ok: true, mode: config.mode }));

  app.listen(config.PORT, () => {
    console.log(`[auth-service] listening on :${config.PORT} (mode=${config.mode}, env=${config.NODE_ENV})`);
  });
}

main().catch((err) => {
  console.error('[auth-service] fatal:', err);
  process.exit(1);
});
