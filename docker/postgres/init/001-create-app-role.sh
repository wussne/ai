#!/bin/sh
set -eu

if [ "${DB_USER}" != "business_user" ]; then
  echo "DB_USER must be business_user because database grants are scoped to this role" >&2
  exit 1
fi

psql --set ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --set app_password="${DB_PASSWORD}" <<'SQL'
SELECT format('CREATE ROLE business_user LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'business_user')
\gexec

SELECT format('ALTER ROLE business_user WITH LOGIN PASSWORD %L', :'app_password')
\gexec
SQL

psql --set ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --file /opt/business-regulations/bootstrap/001_schema.sql

psql --set ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --file /opt/business-regulations/bootstrap/002_seed.sql
