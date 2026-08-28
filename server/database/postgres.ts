import pg from 'pg';

import {environment} from '../config/environment.js';

const {Pool} = pg;

export const postgresPool = new Pool({
  host: environment.database.host,
  port: environment.database.port,
  database: environment.database.name,
  user: environment.database.user,
  password: environment.database.password,
  ssl: environment.database.ssl ? {rejectUnauthorized: false} : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

postgresPool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

export interface DatabaseConnectionInfo {
  database: string;
  user: string;
  version: string;
}

export const checkDatabaseConnection = async (): Promise<DatabaseConnectionInfo> => {
  const result = await postgresPool.query<{
    database: string;
    user_name: string;
    version: string;
  }>(`
    SELECT
      current_database() AS database,
      current_user AS user_name,
      version() AS version
  `);
  const row = result.rows[0];

  if (!row) {
    throw new Error('PostgreSQL connection check returned no data');
  }

  return {
    database: row.database,
    user: row.user_name,
    version: row.version,
  };
};

export const closeDatabaseConnection = async (): Promise<void> => {
  await postgresPool.end();
};
