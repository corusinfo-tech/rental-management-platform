# RC1 Platform Verification Report

Date: 2026-07-16 (Asia/Kolkata)

## Decision

**Local release-candidate verification: PASS.**

**Immediate server update: CONDITIONAL / HOLD until the pre-deployment controls in Remaining Issues are completed.** The application, migrations, disposable runtime, security checks, and end-to-end workflow passed locally. The current workspace is not a Git worktree, so a deployable commit SHA cannot be identified or compared with the GitHub/server revision. Production secrets, database backup, migration checksums, and the live server rollback point were intentionally not accessed or tested.

No deployment was performed.

## Verification environment

- Host: macOS arm64
- Host Node.js used for root commands: 24.14.0 (compatible with the repository's `>=20.9.0` range)
- Container Node.js: 22 Alpine
- Repository package manager declaration: pnpm 11.7.0
- Host pnpm: 11.9.0
- Container pnpm: 11.7.0 through Corepack
- Prisma CLI/client: 6.19.3
- TypeScript: 5.9.3
- Turbo: 2.10.4
- Docker client/server: 29.6.1 / 29.5.2
- Docker Compose: 5.3.1
- PostgreSQL: 16 Alpine
- Redis: 7 Alpine
- Git revision: **NOT AVAILABLE** (`git status` reports that this directory is not a Git repository)

Only disposable local PostgreSQL and Redis services were used. No development, staging, production, or VPS service was accessed.

## Stabilization changes

### Workspace execution and build

- Restored the root ESLint and Docker ignore files required by workspace and image builds.
- Corrected the pnpm v11 native-build allow-list entry for Argon2.
- Added Prisma configuration so the multi-file schema and root migration directory are resolved consistently.
- Passed `IDENTITY_TEST_DATABASE_URL` and `REDIS_URL` through Turbo so root `pnpm test` executes integration tests instead of silently skipping them.
- Added the API's direct Express runtime dependency and refreshed the frozen lockfile.

### Runtime packaging

- API and Worker retain multi-stage Node 22 Alpine images.
- Production packages are created with pnpm v11 legacy deploy compatibility and `--prefer-offline` reuse.
- Manual workspace `node_modules` copying was removed.
- Generated Prisma client artifacts are copied into each deployed package.
- API and Worker production images both build and start successfully.

### Application stabilization

- Exported the configured JWT module so protected consumer modules can resolve `JwtService` at runtime.
- Corrected organization manager authorization to recognize the canonical active `OrganizationMembership.isOwner` flag in addition to `OWNER`, `ADMIN`, and `PROPERTY_MANAGER` roles. Organization ID, active membership, user, and soft-delete constraints remain enforced.
- Corrected stale test fixtures for organization invitations, settings concurrency, public registration, and generic verification subjects without weakening assertions.
- Corrected clean-migration compatibility for the duplicate one-owner index and the E.164 constraint behavior.

## Files changed

- `.dockerignore`
- `.eslintrc.cjs`
- `apps/api/package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `turbo.json`
- `prisma.config.ts`
- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/api/src/identity/identity.module.ts`
- `apps/api/src/property/property.repository.ts`
- `apps/api/src/rental/lease.repository.ts`
- `apps/api/src/rental/billing.repository.ts`
- `apps/api/src/finance/invoice.repository.ts`
- `apps/api/src/finance/payment.repository.ts`
- `apps/api/test/organization-invitation.service.test.mjs`
- `apps/api/test/organization-settings.service.test.mjs`
- `apps/api/test/public-registration.service.test.mjs`
- `apps/api/test/verification-subjects.service.test.mjs`
- `tests/identity-database.test.mjs`
- `prisma/migrations/20260713160000_identity_database_foundation/migration.sql`
- `prisma/migrations/20260714100000_organization_domain_foundation/migration.sql`
- This report

## Infrastructure verification

| Control | Result | Evidence |
|---|---|---|
| Frozen workspace install | PASS | Existing frozen installation and both frozen Docker build stages completed with pnpm 11.7.0. |
| `pnpm typecheck` | PASS | 12/12 Turbo tasks, exit 0. |
| `pnpm lint` | PASS | 12/12 Turbo tasks, exit 0. |
| `pnpm build` | PASS | 12/12 Turbo tasks, exit 0; Next.js 15.5.20 production build completed. |
| `pnpm test` | PASS | 12/12 Turbo tasks, exit 0, database suite included. |
| API tests | PASS | 70 passed, 0 failed, 0 skipped. |
| Database tests | PASS | 16 passed, 0 failed, 0 skipped. |
| Worker tests | PASS | 6 passed, 0 failed, 0 skipped. |

The seven previously reported failures are no longer present. The final suite has zero failures; assertions were not relaxed.

## Prisma and migration verification

| Command/control | Result |
|---|---|
| `pnpm prisma format --schema prisma/schemas` | PASS |
| `pnpm prisma validate --schema prisma/schemas` | PASS |
| `pnpm prisma generate --schema prisma/schemas` | PASS |
| Clean PostgreSQL migration | PASS: all 23 migrations applied in order to an empty PostgreSQL 16 database. |
| Migration deploy replay | PASS: 23 migrations found and no pending migration. |
| Seed | PASS: standard roles and permissions only. |
| Constraint/index inspection | PASS through the 16-test PostgreSQL suite. |
| Transaction rollback | PASS for failed session and registration transactions. |
| Schema rollback rehearsal | PASS by restoring a pre-migration snapshot: 23 applied migrations before restore; 0 public tables and no `_prisma_migrations` relation after restore. |

Prisma does not generate down migrations. The tested schema rollback is the approved backup/restore model, not an automatic reverse SQL migration.

## Docker verification

`docker-compose.test.yml` was built and started with the final API and Worker images.

| Service | Result | Port/evidence |
|---|---|---|
| PostgreSQL 16 | HEALTHY | `127.0.0.1:55432` |
| Redis 7 | HEALTHY | `127.0.0.1:56379` |
| Mailpit | HEALTHY | SMTP `11025`, UI `18025` |
| MinIO | HEALTHY | API `19000`, console `19001` |
| API | HEALTHY | `13001`; `/health` 200; `/docs` 200 |
| Worker | HEALTHY | `13011`; `/health/ready` 200; log contains `Worker started.` |

Final image IDs:

- API: `33f2f144ce4f`
- Worker: `01b61fd8e60d`

The classic Compose builder emitted a missing-buildx warning. It did not prevent either image from building, but installing/configuring Buildx is recommended for faster CI and server builds.

## API, authentication, validation, and RBAC verification

- Health endpoint: 200.
- Swagger UI and OpenAPI JSON: 200.
- OpenAPI inventory: 75 paths, 96 operations, 82 bearer-protected operations.
- The 14 public operations are health, registration/login/refresh, verification/password-reset requests and confirmations, and invitation accept/decline. No business CRUD endpoint was unintentionally public.
- Malformed registration: 400.
- Unknown account login: 401.
- Wrong password login: 401 with the same generic error representation.
- Protected endpoint without a token: 401.
- Route/header organization mismatch: 400.
- Cross-organization route access: 403.
- Refresh rotation: 200.
- Reuse of the old refresh token: 401.
- Logout: 200.
- Reuse of the revoked access session after logout: 401.
- Packaged-image landlord owner property access: 200.

## End-to-end workflow verification

The workflow ran against the freshly compiled API with disposable PostgreSQL and Redis. A public landlord registration was used. Because landlord registration intentionally creates `PENDING_REVIEW` / `PENDING`, the disposable fixture was administratively activated before login; no production approval boundary was bypassed.

| Step | Result |
|---|---|
| Register landlord | PASS, 202 generic accepted response |
| Login | PASS, 200, persisted session, 900-second access TTL |
| Create Property | PASS, 201 |
| Create Building | PASS, 201 |
| Create Floor | PASS, 201 |
| Create Unit | PASS, 201 |
| Create Lease | PASS, 201 |
| Create Billing Calendar | PASS, 201 |
| Generate and list Rent Schedule | PASS, 201 / 200 |
| Generate issued Invoice | PASS, 201 |
| Receive full Payment | PASS, 201 |
| Generate/read Receipt | PASS, 200; receipt ID persisted |
| Verify Outstanding Balance | PASS, invoice `PAID`, outstanding balance `0` |

## Remaining issues and server-update controls

1. **Git revision is unavailable (deployment blocker).** This workspace has no `.git` directory. Before updating the server, commit these exact files to the intended GitHub repository and record the commit SHA. Compare that SHA with the server checkout/image label.
2. **Migration checksum review is required (deployment blocker).** Two historical migration files were corrected to make clean PostgreSQL execution and constraints valid. Before `migrate deploy` on any existing server database, run `prisma migrate status`, compare `_prisma_migrations` checksums with the deployment repository, and prepare a reviewed `prisma migrate resolve` plan only if the server already applied an older checksum. Never edit the production migration table manually.
3. **Create a production backup and restore point (deployment blocker).** The disposable backup/restore rehearsal passed, but the real server backup has not been created or tested in this task.
4. **Validate `.env.production` on the server (deployment blocker).** Secrets, SMTP, public URLs, TLS proxying, persistent volume capacity, and actual server ports were not accessed. Do not copy example secrets.
5. **Registration status-code contract needs a product decision.** Runtime returns 202 Accepted, while an older G2.1 acceptance statement requested 201. The current generic asynchronous registration behavior is internally documented as 202; clients must align with the chosen contract.
6. **Host verification used Node 24 while runtime images use Node 22.** The exact API/Worker container builds passed on Node 22. CI should continue to run the declared Node 22 matrix before deployment.
7. **Buildx is not installed/configured locally.** Classic builds pass but are slow and emit a Compose warning.
8. **Production infrastructure was not started.** `docker-compose.production.yml`, production credentials, reverse proxy, TLS, DNS, and server resource limits require a separate pre-deployment check.

## Recommended server update sequence

1. Commit and push the exact verified tree; record the commit SHA and immutable image tags.
2. On the server, verify the current SHA, `.env.production` validation, free disk/memory, service health, and migration history.
3. Take and verify a PostgreSQL backup and record the current API/Worker image digests.
4. Build or pull the immutable candidate images without stopping the current release.
5. Run `prisma migrate status`, then `prisma migrate deploy` as a separately logged release step.
6. Start API and Worker; require PostgreSQL, Redis, API, and Worker readiness before traffic cutover.
7. Smoke-test health, Swagger availability policy, login, refresh, one protected organization read, and Worker readiness.
8. If application rollback is needed, restore prior image digests. If schema rollback is required, use the approved database snapshot restore; do not run `prisma db push`, `migrate reset`, or ad-hoc destructive SQL on the server.

The code is a verified local deployment candidate, but the server update should remain on hold until controls 1–4 are evidenced.
