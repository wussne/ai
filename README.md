<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/54cc206d-97e5-41e8-8b9c-b14a9a3dda8a

## Run Locally

**Prerequisites:** Node.js and PostgreSQL


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill in the environment variables.
3. Start the client and PostgreSQL API together:
   `npm run dev`

To run them separately, use `npm run dev:server` and `npm run dev:client` in
two terminals.

The API listens on `http://localhost:3001`. The Vite development server proxies
all `/api` requests to it. You can verify PostgreSQL connectivity with:

`GET http://localhost:3001/api/health/database`

The PostgreSQL connection is implemented as a shared connection pool in
`server/database/postgres.ts`. Credentials are read only by the Node.js process
from `.env.local`; they must never be exposed through `VITE_*` variables.

## Authentication

Authentication uses server-side sessions stored in PostgreSQL. Apply migrations
in order using a database owner account:

```bash
psql -d business_regulations -f server/database/migrations/001_authentication.sql
psql -d business_regulations -f server/database/migrations/002_organizations.sql
psql -d business_regulations -f server/database/migrations/003_management_permissions.sql
psql -d business_regulations -f server/database/migrations/004_audit_log.sql
```

Create a user without storing the plaintext password in the database or source:

```bash
AUTH_USER_PASSWORD='a-long-password' npm run user:create -- \
  --name 'User Name' \
  --email 'user@company.test'
```

The browser receives only an `HttpOnly` session cookie. Routes are available at
`/api/auth/login`, `/api/auth/logout`, and `/api/auth/me`. All other `/api`
routes are authentication-protected by default; health checks remain public.

## Organizations

Business data is tenant-scoped through `organization_id`. A global user gets
access through `organization_memberships`; department, position and roles belong
to that membership rather than to the global account. The active organization is
sent as `X-Organization-Slug` and is always verified against the authenticated
user's memberships. If a user has exactly one organization, it is selected
automatically.

Set `APP_BASE_DOMAIN` in production to resolve the same organization slug from a
subdomain such as `acme.example.com`. Subdomains are only a resolution mechanism;
database filtering and composite foreign keys remain the isolation boundary.

## Organization management and permissions

The `/api/management` routes manage the current tenant's company card,
employees, department tree, positions, responsibilities, business functions,
regulations, roles and role-permission matrix. Every request is checked against
the authenticated organization membership. Owners bypass role checks; other
members need the exact `*.view`, `*.edit`, `*.create`, `*.delete` or `*.manage`
permission used by the route.

System permission codes are global and immutable from tenant UI. Organization
owners customize access by creating roles and selecting permission codes. A
non-owner cannot grant a permission or assign a role that exceeds their own
effective access.

## Audit log

PostgreSQL row triggers append every business-data mutation to `audit_logs`.
Application transactions attach the actor, organization membership, request ID,
HTTP method, path, IP address and user agent. Successful login/logout and local
process-audit lifecycle events are appended explicitly. Password hashes,
plaintext passwords, session payloads and full regulation content are never
copied into the log.

The journal is read-only in the application and available through
`GET /api/audit-logs` to owners or members with `log.view`. The application
database role has only `SELECT` and `INSERT` privileges on this table.
