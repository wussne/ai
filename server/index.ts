import express, {type ErrorRequestHandler} from 'express';

import {requireAuthentication} from './auth/auth.middleware.js';
import {authRouter} from './auth/auth.routes.js';
import {sessionMiddleware} from './auth/session.js';
import {environment} from './config/environment.js';
import {
  checkDatabaseConnection,
  closeDatabaseConnection,
} from './database/postgres.js';
import {healthRouter} from './routes/health.js';
import {requireOrganizationContext} from './organizations/organization.middleware.js';
import {organizationRouter} from './organizations/organization.routes.js';
import {loadOrganizationAccess} from './access/access.middleware.js';
import {accessRouter} from './access/access.routes.js';
import {managementRouter} from './management/management.routes.js';
import {HttpError} from './http/http-error.js';
import {auditRouter} from './audit/audit.routes.js';
import {processRouter} from './processes/process.routes.js';

const app = express();

app.disable('x-powered-by');
if (environment.isProduction) {
  app.set('trust proxy', 1);
}
app.use(express.json({limit: '1mb'}));
app.use('/api/health', healthRouter);
app.use(sessionMiddleware);
app.use('/api/auth', authRouter);
app.use('/api', requireAuthentication);
app.use('/api/organizations', organizationRouter);
app.use('/api', requireOrganizationContext);
app.use('/api', loadOrganizationAccess);
app.use('/api/access', accessRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/processes', processRouter);
app.use('/api/management', managementRouter);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({message: error.message});
    return;
  }
  console.error('Unhandled server error:', error);
  response.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};

app.use(errorHandler);

const startServer = async (): Promise<void> => {
  const database = await checkDatabaseConnection();
  console.info(
    `PostgreSQL connected: database=${database.database}, user=${database.user}`,
  );

  const server = app.listen(environment.server.port, () => {
    console.info(`API server is listening on http://localhost:${environment.server.port}`);
  });

  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.info(`${signal} received, shutting down`);

    server.close(() => {
      void closeDatabaseConnection()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          console.error('Failed to close PostgreSQL pool:', error);
          process.exit(1);
        });
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

void startServer().catch(async (error: unknown) => {
  console.error('Failed to start API server:', error);
  await closeDatabaseConnection().catch(() => undefined);
  process.exitCode = 1;
});
