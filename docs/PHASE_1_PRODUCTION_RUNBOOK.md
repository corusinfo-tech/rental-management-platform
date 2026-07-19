# Phase 1 Production Deployment and Smoke-Test Runbook

Status: prepared only; not executed. Phase 2 is outside this runbook.

Server checkout: `/opt/rentalos/rental-management-app`

## Release controls

1. Obtain the approved Phase 1 implementation SHA from `PHASE_1_IMPLEMENTATION_REPORT.md`; call it `<approved-sha>` below.
2. Confirm the approved SHA is merged into the intended release branch, or record explicit approval to deploy the pinned feature-branch SHA. Do not deploy an unreviewed moving branch tip.
3. Establish a maintenance window, assign an operator and reviewer, and identify the last known-good application SHA/image.
4. Keep the additive Phase 1 database schema during application rollback. Never use `prisma migrate reset`, destructive reverse SQL, or `docker compose down -v`.

## 1. Verify and pin source

```bash
cd /opt/rentalos/rental-management-app
git fetch --prune origin
git status --short
git rev-parse HEAD
git show --no-patch --format='%H %cI %s' <approved-sha>
git merge-base --is-ancestor <approved-sha> origin/<approved-release-branch>
git switch --detach <approved-sha>
test "$(git rev-parse HEAD)" = '<approved-sha>'
git status --short
shasum -a 256 prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql
```

Expected: the worktree is clean, `HEAD` equals the approved SHA, the merge-base check succeeds when a merged release is required, and the migration checksum matches the implementation report. Stop if any result differs.

## 2. Validate configuration without printing secrets

```bash
test -f .env.production
docker compose --env-file .env.production -f docker-compose.production.yml --profile release config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml --profile release config --services
```

Expected services: `postgres`, `redis`, `api`, `migrate`, `web`, and `worker`. `config --quiet` must exit zero. Do not paste expanded Compose configuration into tickets or logs because it may contain resolved secrets.

## 3. Snapshot PostgreSQL

Create a root/operator-only backup directory outside the repository, then take and verify a logical snapshot before migration. Replace `<timestamp>` with an explicit UTC timestamp; do not rely on an unreviewed shell expansion.

```bash
install -d -m 700 /opt/rentalos/backups
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > /opt/rentalos/backups/noagent4u-before-phase1-<timestamp>.dump
test -s /opt/rentalos/backups/noagent4u-before-phase1-<timestamp>.dump
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres sh -c 'pg_restore --list' < /opt/rentalos/backups/noagent4u-before-phase1-<timestamp>.dump >/dev/null
```

Expected: a non-empty restricted backup whose archive listing validates. Record its path, byte size, checksum, database host, and operator; never commit it.

## 4. Record current migration status

Build the release migration target from the pinned SHA and run status through that image because the long-running API image intentionally omits Prisma migration files.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build migrate
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate pnpm exec prisma migrate status --schema prisma/schemas
```

Expected before migration: either `Database schema is up to date!` or only `20260719120000_phase1_authorization_isolation` pending. Stop for failed/unknown migrations or drift.

## 5. Build and execute migration

The build command has four named targets: `migrate`, `api`, `worker`, and `web`.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build migrate api worker web
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate pnpm exec prisma migrate status --schema prisma/schemas
```

Expected: all four builds succeed; migration exits zero; final status says the database schema is up to date. Capture the migration container output and image identifiers.

## 6. Deploy API, worker, and web

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps api worker
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps web
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Expected: `api`, `worker`, and `web` are running; API and worker become healthy. Confirm that the images were built from `<approved-sha>` in the release evidence.

## 7. Health and log checks

```bash
curl --fail --silent --show-error http://127.0.0.1:3001/health
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --since=15m --no-color api worker web
```

Expected: both HTTP checks succeed, API/worker health is healthy, and logs contain no migration, Prisma, authorization, unhandled-exception, restart-loop, or database/Redis connectivity errors. The worker readiness endpoint is container-internal and is already exercised by its Compose healthcheck.

## 8. Authenticated smoke matrix

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

## 9. Settings and database invariants

With a reviewed read-only database session, record counts without exporting row contents:

- one `OrganizationSettings` row per active organization and no duplicate `organizationId`;
- expected `PlatformPrincipal` count and no inactive/revoked principal authorized by smoke tests;
- no active portfolio assignment whose property or membership belongs to another organization;
- no verified tenant link without an accepted same-organization invitation and active membership;
- no payment whose non-null property belongs to another organization;
- ambiguous/unmatched historical payments remain null and denied.

## 10. Completion evidence

Record the pinned SHA, migration checksum, backup checksum/path, pre/post migration status, Compose build image IDs, `docker compose ps`, health responses, redacted smoke matrix, and relevant log window. Keep secrets, tokens, database URLs, personal data, and backup contents out of the evidence package.

## Rollback and forward-fix conditions

- **Before migration:** abort with no application change if source, backup, configuration, build, or migration-status verification fails.
- **Migration fails:** do not start new application containers. Preserve logs and snapshot; inspect `_prisma_migrations`. Use a reviewed forward migration or Prisma failed-migration recovery procedure—never reset production.
- **Migration succeeds but application fails before Phase 1-only writes:** restore the last known-good API/worker/web images while retaining the additive schema.
- **Phase 1-only writes have occurred:** prefer a reviewed forward fix. Do not run an older image that requires non-null legacy `Property.ownerUserId` without an approved compatibility backfill.
- **Authorization smoke fails or any cross-organization access succeeds:** remove public traffic from the affected service, preserve evidence, revoke affected sessions if required, and forward-fix before reopening. Treat this as a release blocker.
- **Backfill is incorrect:** correct data with an audited, idempotent forward migration. Do not drop the new platform-principal, portfolio, tenant-link, Settings, or payment-scope structures.

Production deployment requires a separate explicit approval. This runbook does not authorize executing any server command.
