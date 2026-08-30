import connectPgSimple from 'connect-pg-simple';
import expressSession from 'express-session';

import {environment} from '../config/environment.js';
import {postgresPool} from '../database/postgres.js';

const PostgresSessionStore = connectPgSimple(expressSession);

export const SESSION_COOKIE_NAME = 'business.sid';

export const sessionCookieOptions = {
  httpOnly: true,
  secure: environment.session.cookieSecure,
  sameSite: environment.session.cookieSameSite,
  path: '/',
};

export const sessionMiddleware = expressSession({
  name: SESSION_COOKIE_NAME,
  secret: environment.session.secret,
  store: new PostgresSessionStore({
    pool: postgresPool,
    tableName: 'user_sessions',
    pruneSessionInterval: 15 * 60,
    disableTouch: true,
  }),
  cookie: {
    ...sessionCookieOptions,
    maxAge: environment.session.maxAgeMs,
  },
  proxy: environment.server.trustProxy !== false,
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
});
