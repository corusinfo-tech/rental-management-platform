# G1 Security Foundation Report

## Scope

This sprint addresses the active, canonical platform foundation only. It does not add Organization, Property, or Finance modules, nor does it reactivate any implementation isolated under `legacy/`.

## Environment validation

`apps/api/src/config/environment.ts` is now the single runtime configuration boundary. `ConfigModule.forRoot()` validates configuration before Nest starts.

| Variable | Rule |
| --- | --- |
| `DATABASE_URL` | Required PostgreSQL URL. |
| `JWT_ACCESS_SECRET` | Required, non-empty, at least 32 characters, and distinct from refresh secret. |
| `JWT_REFRESH_SECRET` | Required, non-empty, at least 32 characters, and distinct from access secret. |
| `JWT_ISSUER` | Required non-empty string. |
| `JWT_AUDIENCE` | Required non-empty string. |
| `JWT_ALGORITHM` | Required and limited to `HS256`. |
| `JWT_ACCESS_TTL_SECONDS` | Positive integer; defaults to 900 seconds. |
| `JWT_REFRESH_TTL_SECONDS` | Positive integer; defaults to 2,592,000 seconds. |
| `PORT` | Positive integer; defaults to 3001. |

Active application code has no `process.env` reads. Prisma receives the validated database URL through `PrismaService`; JWT configuration is consumed through `ConfigService`.

Startup validation was exercised with an empty environment. Nest aborted before startup with `Missing required environment variable: JWT_ACCESS_SECRET`.

## JWT configuration

- Access and refresh tokens use different validated secrets.
- Tokens are signed with explicit `HS256`, issuer, audience, and TTL configuration.
- Access-token and refresh-token verification enforce the same algorithm, issuer, audience, and secret.
- Swagger now includes the `access-token` bearer scheme.
- Public registration creates a `REGISTERED` account but returns no credentials; login rejects any non-`ACTIVE` user. This prevents the prior unverified-account authentication bypass while delivery/verification remains a later Identity workflow.

## Session rotation and reuse detection

The active Identity repository now uses one injected `PrismaService`, including a transaction boundary for identity workflows.

Refresh rotation performs the following in one database transaction:

1. Validate the refresh JWT and look up the specific session.
2. Verify the Argon2 refresh-token hash.
3. Atomically transition the old active session to `ROTATED` with `updateMany` conditional on its unrevoked, unexpired state.
4. Create exactly one successor session in the same family with a parent-session reference and an Argon2 hash only.
5. If a matching revoked token is presented, or the conditional transition loses a race, revoke every active session in that family with `REUSE_DETECTED`.

The database schema already supplies the required session family, expiry, revocation, device/IP, last-used, and hash-only columns. No plaintext refresh or verification secret is persisted.

## RBAC foundation

The following framework-only components were added under `apps/api/src/identity/authorization/`:

- `AccessTokenGuard`
- `OrganizationResolver` using the `x-organization-id` header
- `CurrentMembershipResolver`
- `PermissionGuard` and `RequirePermissions`
- `PolicyGuard` and `RequirePolicies`
- `CurrentMembership` request decorator

The membership resolver derives permissions from active membership roles and role permissions. No business endpoint uses a permission or policy decorator yet, and no business permission was introduced by this sprint.

## Docker recovery

- Replaced active Docker package filters with `@noagent4u/api` and `@noagent4u/web`.
- Rebuilt API and web Dockerfiles around the root pnpm workspace and root Prisma schema.
- Added an API container health check and `.dockerignore` to prevent workspace/build artifacts and secrets entering the build context.
- Updated the stale Virtualmin command reference to `@noagent4u/api`.

The host used for this sprint has no `docker` executable, so `docker build` and `docker compose` could not be run. The Dockerfiles were statically aligned with the workspace and application build commands, but live container verification remains required in CI or a Docker-capable environment.

## Migration, seed, and rollback verification

`tests/identity-database.test.mjs` now performs the following when `IDENTITY_TEST_DATABASE_URL` points to an isolated PostgreSQL database:

1. `prisma migrate deploy` against the configured test database.
2. Constraint/index verification.
3. Identity seed execution and assertions that it creates only standard system roles and permissions—never users or organizations.
4. Normalized email/mobile, membership foreign key, cross-organization role, hash-storage, verification-expiry, and session-family assertions.
5. A forced transaction failure and assertion that the session write rolls back.

Prisma does not provide automatic down migrations. The rollback test therefore verifies the transactional rollback property used by security-sensitive persistence. Migration rollback requires an explicit, reviewed down-migration strategy before it can be automated safely.

The host has neither Docker nor PostgreSQL client/server binaries and no `IDENTITY_TEST_DATABASE_URL` was supplied. The database suite was invoked and correctly skipped; live migration, seed, and rollback execution remains pending on an isolated PostgreSQL service.

## Verification results

| Check | Result |
| --- | --- |
| `pnpm prisma format --schema prisma/schemas` | Passed |
| `pnpm prisma validate --schema prisma/schemas` | Passed with a PostgreSQL-format `DATABASE_URL` |
| `pnpm prisma generate --schema prisma/schemas` | Passed |
| Empty-environment API startup | Passed: startup rejected missing JWT configuration before serving traffic |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed; database suite skipped without `IDENTITY_TEST_DATABASE_URL` |
| `pnpm build` | Passed |
| Swagger compilation | Passed; bearer scheme is configured in `main.ts` |
| Docker build / Compose | Not runnable: Docker is unavailable on the host |
| Fresh PostgreSQL migration / seed / rollback | Not runnable: no isolated PostgreSQL URL or PostgreSQL tooling on the host |

## Required external verification command

Run this only against a disposable PostgreSQL database:

```bash
IDENTITY_TEST_DATABASE_URL=postgresql://user:password@host:5432/noagent4u_identity_test \
pnpm --filter @noagent4u/database test
```

Then build and start the production Compose profile in a Docker-capable environment, confirm API `/health`, and open `/docs` to verify the bearer-auth Swagger declaration.

## Remaining scope deliberately deferred

- Email, WhatsApp, OTP, password-reset, and account-verification delivery workflows.
- Business permission definitions and protected business endpoints.
- Organization, Property, and Finance modules.
- CI service-container execution for migration/seed/Docker verification.
