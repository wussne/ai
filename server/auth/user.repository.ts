import {postgresPool} from '../database/postgres.js';
import type {AuthenticatedUser, UserWithPassword} from './auth.types.js';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
}

const toAuthenticatedUser = (row: UserRow): AuthenticatedUser => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
});

const USER_SELECT = `
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.password_hash,
    u.is_active
  FROM users u
`;

export const findUserByEmail = async (email: string): Promise<UserWithPassword | null> => {
  const result = await postgresPool.query<UserRow>(
    `${USER_SELECT} WHERE lower(u.email) = lower($1) LIMIT 1`,
    [email],
  );
  const row = result.rows[0];

  return row
    ? {
        ...toAuthenticatedUser(row),
        passwordHash: row.password_hash,
        isActive: row.is_active,
      }
    : null;
};

export const findActiveUserById = async (
  id: string,
): Promise<AuthenticatedUser | null> => {
  const result = await postgresPool.query<UserRow>(
    `${USER_SELECT} WHERE u.id = $1 AND u.is_active = true LIMIT 1`,
    [id],
  );
  const row = result.rows[0];

  return row ? toAuthenticatedUser(row) : null;
};
