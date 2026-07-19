# Phase 1 Production Deployment and Smoke-Test Runbook

Status: prepared only; not executed. Phase 2 is outside this runbook.

Server checkout: `/opt/rentalos/rental-management-app`

## Release controls

1. Obtain the approved Phase 1 implementation SHA from `PHASE_1_IMPLEMENTATION_REPORT.md`; call it `<approved-sha>` below. Copy this runbook to an operator-only execution worksheet, replace every angle-bracket placeholder, and have the operator and reviewer confirm that no placeholder remains before executing any command.
2. Confirm the approved SHA is merged into the intended release branch, or record explicit approval to deploy the pinned feature-branch SHA. Do not deploy an unreviewed moving branch tip.
3. Prefer a merge commit or another method that retains the locally validated commit as an ancestor. A squash or rebase produces different source and commit identities: repeat the complete Phase 1 validation against that resulting final SHA before approving it for production.
4. Establish a maintenance window, assign an operator and reviewer, and identify the last known-good application SHA/image.
5. Keep the additive Phase 1 database schema during application rollback. Never use `prisma migrate reset`, destructive reverse SQL, or `docker compose down -v`.

Before continuing, define and validate the execution values in the operator-only shell. These example assignments are intentionally non-executable until every placeholder is replaced:

```bash
export APPROVED_SHA='<approved-sha>'
export APPROVED_RELEASE_BRANCH='<approved-release-branch>'
export BACKUP_TIMESTAMP='<explicit-UTC-timestamp>'

case "$APPROVED_SHA $APPROVED_RELEASE_BRANCH $BACKUP_TIMESTAMP" in
  *'<'*'>'*) echo 'STOP: replace every runbook placeholder before execution' >&2; exit 1 ;;
esac
```

## 1. Verify and pin source

```bash
cd /opt/rentalos/rental-management-app
git fetch --prune origin
git status --short
test -z "$(git status --porcelain)"
git rev-parse HEAD
git show --no-patch --format='%H %cI %s' "$APPROVED_SHA"
git merge-base --is-ancestor "$APPROVED_SHA" "origin/$APPROVED_RELEASE_BRANCH"
git switch --detach "$APPROVED_SHA"
test "$(git rev-parse HEAD)" = "$APPROVED_SHA"
test -z "$(git status --porcelain)"
git status --short
shasum -a 256 prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql
```

Expected: the worktree is clean before and after pinning, `HEAD` equals the approved SHA, the merge-base check succeeds when a merged release is required, and the migration checksum matches the implementation report. If a squash/rebase made the locally validated SHA cease to be an ancestor, stop and validate the resulting release SHA from scratch. Stop if any result differs.

## 2. Confirm authorization-token and session behavior

The accepted Phase 1 source signs access and refresh tokens with authoritative identity claims only (`sub` and `sid`, plus standard JWT claims). It does not embed role or permission claims. Every request verifies that the database Session is active, and organization roles/permissions are resolved from current database state. Therefore the accepted source does not require mass session revocation solely for the Phase 1 role conversion.

Before deployment, verify that the pinned source and any upstream authentication proxy/custom build still have this behavior. Inspect source and decode only a reviewed synthetic token locally without logging or retaining the raw token. Stop if a token or external session cache treats `SUPER_ADMIN`, `OWNER`, `LANDLORD`, role lists, or permission lists as authoritative authorization claims.

If authoritative legacy roles/permissions are found, require forced reauthentication before reopening traffic. After snapshotting and with a reviewed database session, revoke every active session in one audited transaction:

```sql
BEGIN;
UPDATE "Session"
SET "revokedAt" = CURRENT_TIMESTAMP,
    "revokedReason" = 'PHASE1_AUTHORIZATION_CUTOVER',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "revokedAt" IS NULL
  AND "expiresAt" > CURRENT_TIMESTAMP;
COMMIT;
```

Then restart API/worker as planned, verify old access and refresh tokens return 401, require all users to sign in again, and record the affected-session count without recording tokens or user data. If the behavior cannot be determined, treat forced reauthentication as a release gate rather than assuming cached authorization is safe.

## 3. Confirm smoke-account availability

Before building or migrating, the operator and reviewer must confirm that synthetic or explicitly reviewed smoke accounts and known resource IDs exist for every row below. Credentials must be retrievable from the approved secret manager and must never be added to this runbook, shell history, screenshots, or release logs.

- [ ] Platform administrator
- [ ] Organization proprietor/administrator
- [ ] Scoped property manager
- [ ] Scoped finance user
- [ ] Asset owner
- [ ] Verified tenant
- [ ] Outsider
- [ ] Suspended user
- [ ] Administrator and resources in a second organization

Stop if any account, its expected organization/property/lease scope, or a safe cross-organization negative-test resource is unavailable.

## 4. Validate configuration without printing secrets

```bash
test -f .env.production
docker compose --env-file .env.production -f docker-compose.production.yml --profile release config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml --profile release config --services
```

Expected services: `postgres`, `redis`, `api`, `migrate`, `web`, and `worker`. `config --quiet` must exit zero. Do not paste expanded Compose configuration into tickets or logs because it may contain resolved secrets.

## 5. Snapshot PostgreSQL

Create a root/operator-only backup directory outside the repository, then take and verify a logical snapshot before migration.

```bash
install -d -m 700 /opt/rentalos/backups
export BACKUP_PATH="/opt/rentalos/backups/noagent4u-before-phase1-${BACKUP_TIMESTAMP}.dump"
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_PATH"
test -s "$BACKUP_PATH"
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres sh -c 'pg_restore --list' < "$BACKUP_PATH" >/dev/null
```

Expected: a non-empty restricted backup whose archive listing validates. `pg_restore --list` proves archive readability only; it does not prove that the backup can be fully restored. Record its path, byte size, checksum, database host, and operator; never commit it.

When capacity and the maintenance window permit, perform the recommended full restore test on an isolated PostgreSQL instance. If the production PostgreSQL container is the only approved location, use a uniquely named temporary database, confirm that no application points to it, restore with `--exit-on-error`, run reviewed count/integrity checks, and drop only that exact temporary database afterward:

```bash
export RESTORE_TEST_DB="phase1_restore_${BACKUP_TIMESTAMP}"
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$RESTORE_TEST_DB"
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$1" --exit-on-error --no-owner --no-privileges' sh "$RESTORE_TEST_DB" < "$BACKUP_PATH"
# Run reviewed row-count and integrity checks against only "$RESTORE_TEST_DB".
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" "$1"' sh "$RESTORE_TEST_DB"
```

Record whether the full restore test passed or was deferred, why it was deferred, and who accepted that residual risk. Never use the production database name as `RESTORE_TEST_DB`.

## 6. Record current migration status

Build the release migration target from the pinned SHA and run status through that image because the long-running API image intentionally omits Prisma migration files.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build migrate
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate ./node_modules/.bin/prisma migrate status --schema prisma/schemas
```

Expected before migration: either `Database schema is up to date!` or only `20260719120000_phase1_authorization_isolation` pending. Stop for failed/unknown migrations or drift.

## 7. Build and execute migration

The build command has four named targets: `migrate`, `api`, `worker`, and `web`.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build migrate api worker web
docker compose --env-file .env.production -f docker-compose.production.yml images
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate ./node_modules/.bin/prisma migrate deploy --schema prisma/schemas
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate ./node_modules/.bin/prisma migrate status --schema prisma/schemas
```

Expected: all four builds succeed; migration exits zero; final status says the database schema is up to date. Capture the migration container output and the repository/tag/image-ID table from `docker compose images`.

## 8. Deploy API, worker, and web

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps api worker
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps web
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml images
```

Expected: `api`, `worker`, and `web` are running; API and worker become healthy. Confirm that the images were built from `$APPROVED_SHA` in the release evidence.

## 9. Health and log checks

```bash
curl --fail --silent --show-error http://127.0.0.1:3001/health
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --since=15m --no-color api worker web
```

Expected: both HTTP checks succeed, API/worker health is healthy, and logs contain no migration, Prisma, authorization, unhandled-exception, restart-loop, or database/Redis connectivity errors. The worker readiness endpoint is container-internal and is already exercised by its Compose healthcheck.

## 10. Authenticated smoke matrix

Use designated synthetic production smoke accounts or reviewed non-sensitive fixtures. Keep access tokens out of shell history, screenshots, and the runbook. Record request timestamp, principal type, organization/property identifiers, status code, and a redacted result.

| Check                                                            | Expected result                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Settings read for an existing organization                       | 200; exactly one Settings row remains after concurrent reads |
| Platform administrator platform endpoint                         | 200                                                          |
| Platform administrator organization workspace without membership | 403                                                          |
| Organization proprietor/admin own organization                   | 200; organization-wide portfolio                             |
| Scoped manager assigned property                                 | 200                                                          |
| Scoped manager unassigned/direct or second-organization property | 403                                                          |
| Scoped finance assigned invoice/payment                          | 200                                                          |
| Scoped finance property-management endpoint                      | 403                                                          |
| Asset owner owned or explicitly assigned property                | 200                                                          |
| Asset owner unowned/unassigned property                          | 403                                                          |
| Verified tenant linked lease/invoice/payment                     | 200 where an endpoint exists for the linked resource         |
| Tenant unlinked lease or payment with any unlinked allocation    | 403                                                          |
| Outsider, suspended principal, or revoked assignment             | 403                                                          |
| Every direct second-organization resource attempt                | 403                                                          |
| Ambiguous or multi-property historical payment for a scoped user | 403 or omitted from list                                     |

For each allowed list response, verify the returned identifiers—not only the HTTP status. For every denial, verify that the response does not disclose whether the foreign resource exists.

## 11. Settings and database invariants

With a reviewed read-only database session, record counts without exporting row contents:

- one `OrganizationSettings` row per active organization and no duplicate `organizationId`;
- expected `PlatformPrincipal` count and no inactive/revoked principal authorized by smoke tests;
- no active portfolio assignment whose property or membership belongs to another organization;
- no verified tenant link without an accepted same-organization invitation and active membership;
- no payment whose non-null property belongs to another organization;
- ambiguous/unmatched historical payments remain null and denied.

## 12. Completion evidence

Record the pinned SHA, proof that the validated SHA remains an ancestor, migration checksum, backup checksum/path, archive-readability result, full-restore-test result or accepted deferral, pre/post migration status, both `docker compose images` outputs, `docker compose ps`, session-revocation decision/action, smoke-account availability, health responses, redacted smoke matrix, and relevant log window. Keep secrets, tokens, database URLs, personal data, and backup contents out of the evidence package.

## Rollback and forward-fix conditions

- **Before migration:** abort with no application change if source, backup, configuration, build, or migration-status verification fails.
- **Migration fails:** do not start new application containers. Preserve logs and snapshot; inspect `_prisma_migrations`. Use a reviewed forward migration or Prisma failed-migration recovery procedure—never reset production.
- **Migration succeeds but application fails before Phase 1-only writes:** restore the last known-good API/worker/web images while retaining the additive schema.
- **Phase 1-only writes have occurred:** prefer a reviewed forward fix. Do not run an older image that requires non-null legacy `Property.ownerUserId` without an approved compatibility backfill.
- **Authorization smoke fails or any cross-organization access succeeds:** remove public traffic from the affected service, preserve evidence, revoke affected sessions if required, and forward-fix before reopening. Treat this as a release blocker.
- **Backfill is incorrect:** correct data with an audited, idempotent forward migration. Do not drop the new platform-principal, portfolio, tenant-link, Settings, or payment-scope structures.

Production deployment requires a separate explicit approval. This runbook does not authorize executing any server command.
