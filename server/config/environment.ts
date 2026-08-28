import dotenv from 'dotenv';

dotenv.config({path: '.env.local', quiet: true});
dotenv.config({path: '.env', quiet: true});

const requireEnvironmentVariable = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }

  return value;
};

const parsePositiveInteger = (name: string, fallback: number): number => {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }

  return value;
};

const sessionSecret = requireEnvironmentVariable('SESSION_SECRET');

if (sessionSecret.length < 32) {
  throw new Error('Environment variable SESSION_SECRET must contain at least 32 characters');
}

export const environment = {
  isProduction: process.env.NODE_ENV === 'production',
  server: {
    port: parsePositiveInteger('SERVER_PORT', 3001),
  },
  session: {
    secret: sessionSecret,
    maxAgeMs: parsePositiveInteger('SESSION_MAX_AGE_MS', 7 * 24 * 60 * 60 * 1_000),
  },
  organization: {
    baseDomain: process.env.APP_BASE_DOMAIN?.trim().toLowerCase() || null,
  },
  database: {
    host: process.env.DB_HOST?.trim() || 'localhost',
    port: parsePositiveInteger('DB_PORT', 5432),
    name: requireEnvironmentVariable('DB_NAME'),
    user: requireEnvironmentVariable('DB_USER'),
    password: requireEnvironmentVariable('DB_PASSWORD'),
    ssl: process.env.DB_SSL === 'true',
  },
} as const;
