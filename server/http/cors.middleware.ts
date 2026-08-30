import type {RequestHandler} from 'express';

import {environment} from '../config/environment.js';
import {HttpError} from './http-error.js';

const ALLOWED_METHODS = 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type,X-Organization-Slug';

export const corsMiddleware: RequestHandler = (request, response, next) => {
  const origin = request.get('Origin');

  // No configured cross-origin frontend: preserve normal same-origin behavior.
  if (environment.cors.allowedOrigins.size === 0 || !origin) {
    next();
    return;
  }

  if (!environment.cors.allowedOrigins.has(origin)) {
    next(new HttpError(403, 'Origin is not allowed'));
    return;
  }

  response.vary('Origin');
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  response.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  response.setHeader('Access-Control-Max-Age', '600');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  next();
};
