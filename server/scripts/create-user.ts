import {closeDatabaseConnection, postgresPool} from '../database/postgres.js';
import {hashPassword} from '../auth/password.service.js';

const getArgument = (name: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1]?.trim() : undefined;

  if (!value) {
    throw new Error(`Missing required argument --${name}`);
  }

  return value;
};

const createUser = async (): Promise<void> => {
  const fullName = getArgument('name');
  const email = getArgument('email').toLowerCase();
  const password = process.env.AUTH_USER_PASSWORD;

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new Error('A valid --email is required');
  }

  if (!password || password.length < 12 || password.length > 256) {
    throw new Error('AUTH_USER_PASSWORD must contain from 12 to 256 characters');
  }

  const passwordHash = await hashPassword(password);
  const result = await postgresPool.query<{id: string}>(
    `
      INSERT INTO users (full_name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [fullName, email, passwordHash],
  );

  console.info(`User created: id=${result.rows[0]?.id}, email=${email}`);
};

void createUser()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Failed to create user');
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
