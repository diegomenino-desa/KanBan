import session from 'express-session';
import type { RequestHandler } from 'express';
import type { Config } from './config.js';

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

export function buildSessionMiddleware(config: Config): RequestHandler {
  return session({
    name: 'kanban.sid',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.APP_BASE_URL.startsWith('https://'),
      sameSite: 'strict',
      maxAge: EIGHT_HOURS_MS,
      path: '/',
    },
  });
}
