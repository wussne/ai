#!/bin/sh
set -eu

MIGRATIONS_DIR=${MIGRATIONS_DIR:-/opt/business-regulations/migrations}
LOCK_NAME=business_regulations_schema_migrations

attempt=0
until [ "$(psql --tuples-only --no-align --command \
  "SELECT to_regclass('public.organizations') IS NOT NULL" 2>/dev/null || true)" = "t" ]; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge 60 ]; then
    echo "Database baseline was not initialized within 60 seconds" >&2
    exit 1
  fi
  sleep 1
done

{
  cat <<SQL
\set ON_ERROR_STOP on
SELECT pg_advisory_lock(hashtext('${LOCK_NAME}'));

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version varchar(255) PRIMARY KEY,
  checksum char(64) NOT NULL,
  applied_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQL

  found_migration=false
  for migration in "${MIGRATIONS_DIR}"/[0-9][0-9][0-9]_*.sql; do
    if [ ! -f "${migration}" ]; then
      continue
    fi
    found_migration=true
    filename=$(basename "${migration}")
    version=${filename%.sql}
    checksum=$(sha256sum "${migration}" | awk '{print $1}')

    cat <<SQL
SELECT
  NOT EXISTS (
    SELECT 1 FROM public.schema_migrations WHERE version = '${version}'
  ) AS should_apply,
  EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE version = '${version}' AND checksum <> '${checksum}'
  ) AS checksum_mismatch
\gset migration_

\if :migration_checksum_mismatch
  DO \$migration_error\$
  BEGIN
    RAISE EXCEPTION 'Checksum mismatch for applied migration ${filename}';
  END;
  \$migration_error\$;
\endif

\if :migration_should_apply
  \echo 'Applying ${filename}'
  BEGIN;
  \i ${migration}
  INSERT INTO public.schema_migrations (version, checksum)
  VALUES ('${version}', '${checksum}');
  COMMIT;
\else
  \echo 'Already applied ${filename}'
\endif
SQL
  done

  if [ "${found_migration}" = false ]; then
    echo "\\echo 'No deploy migrations found'"
  fi

  cat <<SQL
SELECT pg_advisory_unlock(hashtext('${LOCK_NAME}'));
SQL
} | psql
