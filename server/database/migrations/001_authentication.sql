CREATE TABLE IF NOT EXISTS user_sessions (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expire
  ON user_sessions (expire);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_normalized
  ON users (lower(email))
  WHERE email IS NOT NULL;
