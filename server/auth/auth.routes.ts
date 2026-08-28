import {Router, type Request} from 'express';
import {rateLimit} from 'express-rate-limit';

import type {AuthenticatedUser} from './auth.types.js';
import {requireAuthentication} from './auth.middleware.js';
import {verifyPassword} from './password.service.js';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from './session.js';
import {findUserByEmail} from './user.repository.js';
import {findActiveUserById} from './user.repository.js';
import {findOrganizationsForUser} from '../organizations/organization.repository.js';
import {createAuditContext} from '../audit/audit.types.js';
import {writeAuditEvent} from '../audit/audit.repository.js';

const INVALID_CREDENTIALS_MESSAGE = 'Неверный email или пароль';
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZS1kdW1teS1zYWx0$FAiRvF7BAXVqsHiKrHxa95hCo9qZi7DiX4PL1EAv6rw';

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {message: 'Слишком много попыток входа. Попробуйте позже.'},
});

const regenerateSession = (request: Request) =>
  new Promise<void>((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()));
  });

const saveSession = (request: Request) =>
  new Promise<void>((resolve, reject) => {
    request.session.save((error) => (error ? reject(error) : resolve()));
  });

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, async (request, response, next) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';

  if (!email || email.length > 254 || !password || password.length > 256) {
    response.status(400).json({message: 'Введите email и пароль'});
    return;
  }

  try {
    const user = await findUserByEmail(email);
    const isPasswordValid = await verifyPassword(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      password,
    );

    if (!user || !user.isActive || !isPasswordValid) {
      if (user) {
        const organizations = await findOrganizationsForUser(user.id);
        const attemptedUser: AuthenticatedUser = {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        };
        await Promise.all(organizations.map((organization) =>
          writeAuditEvent(
            createAuditContext(request, attemptedUser, organization),
            'authentication',
            user.id,
            {event: 'login_failed'},
          ),
        ));
      }
      response.status(401).json({message: INVALID_CREDENTIALS_MESSAGE});
      return;
    }

    await regenerateSession(request);
    request.session.userId = user.id;
    await saveSession(request);

    const {passwordHash: _passwordHash, isActive: _isActive, ...publicUser} = user;
    const organizations = await findOrganizationsForUser(user.id);
    await Promise.all(organizations.map((organization) =>
      writeAuditEvent(
        createAuditContext(request, publicUser, organization),
        'authentication',
        user.id,
        {event: 'login'},
      ),
    ));
    response.json({user: publicUser, organizations});
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (request, response, next) => {
  try {
    if (request.session.userId) {
      const user = await findActiveUserById(request.session.userId);
      if (user) {
        const organizations = await findOrganizationsForUser(user.id);
        await Promise.all(organizations.map((organization) =>
          writeAuditEvent(
            createAuditContext(request, user, organization),
            'authentication',
            user.id,
            {event: 'logout'},
          ),
        ));
      }
    }
  } catch (error) {
    next(error);
    return;
  }
  request.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }

    response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
    response.status(204).end();
  });
});

authRouter.get('/me', requireAuthentication, async (_request, response, next) => {
  try {
    const user = response.locals.currentUser as AuthenticatedUser;
    const organizations = await findOrganizationsForUser(user.id);
    response.json({user, organizations});
  } catch (error) {
    next(error);
  }
});
