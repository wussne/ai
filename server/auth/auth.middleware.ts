import type {RequestHandler} from 'express';

import {SESSION_COOKIE_NAME, sessionCookieOptions} from './session.js';
import {findActiveUserById} from './user.repository.js';

export const requireAuthentication: RequestHandler = async (
  request,
  response,
  next,
) => {
  const {userId} = request.session;

  if (!userId) {
    response.status(401).json({message: 'Authentication required'});
    return;
  }

  try {
    const user = await findActiveUserById(userId);

    if (!user) {
      request.session.destroy(() => undefined);
      response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
      response.status(401).json({message: 'Authentication required'});
      return;
    }

    response.locals.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
};
