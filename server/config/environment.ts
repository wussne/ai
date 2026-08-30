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

const parseTrustProxy = (): false | number => {
  const rawValue = process.env.TRUST_PROXY?.trim() || '0';
  const value = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(value) || value < 0 || String(value) !== rawValue) {
    throw new Error('Environment variable TRUST_PROXY must be a non-negative integer');
  }

  return value === 0 ? false : value;
};

const parseBoolean = (name: string, fallback: boolean): boolean => {
  const rawValue = process.env[name]?.trim().toLowerCase();

  if (!rawValue) {
    return fallback;
  }
  if (rawValue === 'true') {
    return true;
  }
  if (rawValue === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${name} must be true or false`);
};

const parseSameSite = (): 'lax' | 'strict' | 'none' => {
  const value = process.env.SESSION_COOKIE_SAME_SITE?.trim().toLowerCase() || 'lax';
  if (value === 'lax' || value === 'strict' || value === 'none') {
    return value;
  }
  throw new Error('Environment variable SESSION_COOKIE_SAME_SITE must be lax, strict or none');
};

const parseOrigins = (rawValue: string | undefined): ReadonlySet<string> => {
  const origins = new Set<string>();
  for (const value of rawValue?.split(',') ?? []) {
    const candidate = value.trim();
    if (!candidate) continue;

    const url = new URL(candidate);
    if (url.origin !== candidate.replace(/\/$/, '') || !['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`CORS origin must contain only scheme and host: ${candidate}`);
    }
    origins.add(url.origin);
  }
  return origins;
};

const sessionSecret = requireEnvironmentVariable('SESSION_SECRET');

if (sessionSecret.length < 32) {
  throw new Error('Environment variable SESSION_SECRET must contain at least 32 characters');
}

const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieSecure = parseBoolean('SESSION_COOKIE_SECURE', isProduction);
const sessionCookieSameSite = parseSameSite();

if (sessionCookieSameSite === 'none' && !sessionCookieSecure) {
  throw new Error('SameSite=None session cookies require SESSION_COOKIE_SECURE=true');
}

export const environment = {
  isProduction,
  server: {
    host: process.env.SERVER_HOST?.trim() || '0.0.0.0',
    port: parsePositiveInteger('SERVER_PORT', 3001),
    trustProxy: parseTrustProxy(),
  },
  session: {
    secret: sessionSecret,
    maxAgeMs: parsePositiveInteger('SESSION_MAX_AGE_MS', 7 * 24 * 60 * 60 * 1_000),
    cookieSecure: sessionCookieSecure,
    cookieSameSite: sessionCookieSameSite,
  },
  cors: {
    allowedOrigins: parseOrigins(process.env.CORS_ORIGINS),
  },
  ai: {
    geminiApiKey: requireEnvironmentVariable('GEMINI_API_KEY'),
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
