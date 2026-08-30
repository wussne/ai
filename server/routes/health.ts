import {Router} from 'express';

import {checkDatabaseConnection} from '../database/postgres.js';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.json({status: 'ok'});
});

healthRouter.get('/database', async (_request, response) => {
  try {
    await checkDatabaseConnection();
    response.json({status: 'ok'});
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
    response.status(503).json({
      status: 'error',
      message: 'Database is unavailable',
    });
  }
});
