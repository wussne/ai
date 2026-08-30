import type {RequestHandler} from 'express';
import {rateLimit} from 'express-rate-limit';

import type {AuthenticatedUser} from '../auth/auth.types.js';

const MAX_CONCURRENT_AI_REQUESTS = 8;
let activeAiRequests = 0;

export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 30,
  keyGenerator: (_request, response) =>
    (response.locals.currentUser as AuthenticatedUser).id,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {message: 'Слишком много запросов к генерации. Попробуйте позже.'},
});

export const limitAiConcurrency: RequestHandler = (_request, response, next) => {
  if (activeAiRequests >= MAX_CONCURRENT_AI_REQUESTS) {
    response.setHeader('Retry-After', '5');
    response.status(503).json({
      message: 'Сервис генерации занят. Повторите запрос через несколько секунд.',
    });
    return;
  }

  activeAiRequests += 1;
  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    activeAiRequests -= 1;
  };

  response.once('finish', release);
  response.once('close', release);
  next();
};
