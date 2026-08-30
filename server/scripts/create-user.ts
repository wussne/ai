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

const getOptionalArgument = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() || undefined : undefined;
};

const createUser = async (): Promise<void> => {
  const fullName = getArgument('name');
  const email = getArgument('email').toLowerCase();
  const organizationSlug = getOptionalArgument('organization')?.toLowerCase() || 'main';
  const isOwner = process.argv.includes('--owner');
  const password = process.env.AUTH_USER_PASSWORD;

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new Error('A valid --email is required');
  }

  if (!password || password.length < 12 || password.length > 256) {
    throw new Error('AUTH_USER_PASSWORD must contain from 12 to 256 characters');
  }

  const passwordHash = await hashPassword(password);
  const connection = await postgresPool.connect();

  try {
    await connection.query('BEGIN');
    const organizationResult = await connection.query<{id: string}>(
      'SELECT id FROM organizations WHERE lower(slug) = $1 AND is_active = true',
      [organizationSlug],
    );
    const organizationId = organizationResult.rows[0]?.id;
    if (!organizationId) {
      throw new Error(`Active organization not found: ${organizationSlug}`);
    }

    const userResult = await connection.query<{id: string}>(
      `
        INSERT INTO users (full_name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [fullName, email, passwordHash],
    );
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      throw new Error('User insert returned no id');
    }

    await connection.query(
      `
        INSERT INTO organization_memberships (organization_id, user_id, is_owner)
        VALUES ($1, $2, $3)
      `,
      [organizationId, userId, isOwner],
    );
    await connection.query('COMMIT');
    console.info(
      `User created: id=${userId}, email=${email}, organization=${organizationSlug}, owner=${isOwner}`,
    );
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
};

void createUser()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Failed to create user');
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
