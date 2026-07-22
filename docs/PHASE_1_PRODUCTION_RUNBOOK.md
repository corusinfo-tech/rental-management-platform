# Phase 1 Production Deployment and Smoke-Test Runbook

Status: prepared only; not executed. Phase 2 is outside this runbook.

**No command in this document is authorized until a separate production approval names the exact release SHA, maintenance window, operator, and reviewer.** The existing production checkout is preservation evidence, not a deployment source.

## Release controls and immutable paths

The existing checkout is permanently treated as a preserved legacy checkout:

```bash
export LEGACY_CHECKOUT=/opt/rentalos/rental-management-app
export RELEASE_ROOT=/opt/rentalos/releases
export RELEASE_SHA='<approved-full-40-character-sha>'
export RELEASE_DIR="${RELEASE_ROOT}/${RELEASE_SHA}"
export CANONICAL_REPOSITORY=https://github.com/corusinfo-tech/rental-management-platform.git
export APPROVED_RELEASE_BRANCH=main
export PRODUCTION_ENV_FILE='<approved-stable-production-env-path>'
export RECONCILIATION_BACKUP='<existing-reconciliation-backup-path>'
export EXPECTED_COMPOSE_PROJECT_NAME='<existing-compose-project-name-from-reviewed-records>'
export EXPECTED_POSTGRES_VOLUME='<existing-postgres-volume-name>'
export EXPECTED_REDIS_VOLUME='<existing-redis-volume-name>'
export EXPECTED_ENV_OWNER='<approved-production-env-owner>'
export EXPECTED_PRODUCTION_DB_NAME='<existing-production-database-name>'
export EXPECTED_MIGRATION_SHA256='<reviewed-phase1-migration-sha256>'
export MIN_RELEASE_FREE_KB='<reviewed-minimum-free-kilobytes>'
export BACKUP_TIMESTAMP='<explicit-UTC-timestamp>'

case "$RELEASE_SHA $PRODUCTION_ENV_FILE $RECONCILIATION_BACKUP $EXPECTED_COMPOSE_PROJECT_NAME $EXPECTED_POSTGRES_VOLUME $EXPECTED_REDIS_VOLUME $EXPECTED_ENV_OWNER $EXPECTED_PRODUCTION_DB_NAME $EXPECTED_MIGRATION_SHA256 $MIN_RELEASE_FREE_KB $BACKUP_TIMESTAMP" in
  *'<'*'>'*) echo 'STOP: replace every runbook placeholder before execution' >&2; exit 1 ;;
esac
printf '%s\n' "$RELEASE_SHA" | grep -Eq '^[0-9a-f]{40}$'
printf '%s\n' "$EXPECTED_MIGRATION_SHA256" | grep -Eq '^[0-9a-f]{64}$'
printf '%s\n' "$MIN_RELEASE_FREE_KB" | grep -Eq '^[1-9][0-9]*$'
test "$RELEASE_DIR" = "$RELEASE_ROOT/$RELEASE_SHA"
```

Never run `checkout`, `switch`, `reset`, `restore`, `clean`, `stash`, `pull`, `merge`, `rebase`, deletion, or any other mutating Git/filesystem command in `LEGACY_CHECKOUT`. Do not overwrite its three preserved tracked modifications, delete its reconciliation backup, copy its worktree or uncommitted contents into a release, or deploy directly from it. It may be inspected read-only only.

Never run `prisma migrate reset`, destructive reverse SQL, or `docker compose down -v`. Preserve the legacy checkout, reconciliation backup, previous images, PostgreSQL and Redis volumes, and last known-good release for rollback.

## 1. Read-only preflight

Run this phase only after the separate production approval. It must not mutate the legacy checkout, containers, volumes, database, or environment file.

### 1.1 Preserve and inspect the legacy checkout

```bash
test -d "$LEGACY_CHECKOUT/.git"
test -e "$RECONCILIATION_BACKUP"
git -C "$LEGACY_CHECKOUT" status --short
git -C "$LEGACY_CHECKOUT" diff --name-only
git -C "$LEGACY_CHECKOUT" diff --cached --name-only
```

Expected: the known preservation state is visible. Do not require this worktree to be clean and do not attempt to change it. Stop if the three preserved tracked modifications or reconciliation backup cannot be accounted for.

### 1.2 Verify the approved GitHub source and release directory

```bash
test "$CANONICAL_REPOSITORY" = 'https://github.com/corusinfo-tech/rental-management-platform.git'
REMOTE_MAIN_SHA="$(git ls-remote "$CANONICAL_REPOSITORY" refs/heads/main | awk 'NR == 1 { print $1 }')"
test "$REMOTE_MAIN_SHA" = "$RELEASE_SHA"

test -d "$RELEASE_ROOT" || test -d "$(dirname "$RELEASE_ROOT")"
AVAILABLE_RELEASE_KB="$(df -Pk "$(dirname "$RELEASE_ROOT")" | awk 'NR == 2 { print $4 }')"
test "$AVAILABLE_RELEASE_KB" -ge "$MIN_RELEASE_FREE_KB"

if test -e "$RELEASE_DIR"; then
  test -d "$RELEASE_DIR/.git"
  test "$(git -C "$RELEASE_DIR" remote get-url origin)" = "$CANONICAL_REPOSITORY"
  test "$(git -C "$RELEASE_DIR" rev-parse HEAD)" = "$RELEASE_SHA"
  test -z "$(git -C "$RELEASE_DIR" status --porcelain)"
fi
```

Expected: canonical `main` resolves to the approved immutable SHA, adequate reviewed disk capacity exists, and an existing `RELEASE_DIR` is either absent or already contains exactly that clean canonical source. Stop rather than overwrite, reuse, or delete a directory containing different source.

### 1.3 Discover and independently confirm Compose identity and volumes

```bash
API_CONTAINER_ID="$(docker ps -q --filter publish=3001 --filter label=com.docker.compose.service=api)"
test "$(printf '%s\n' "$API_CONTAINER_ID" | sed '/^$/d' | wc -l | tr -d ' ')" -eq 1
export COMPOSE_PROJECT_NAME="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$API_CONTAINER_ID")"
test -n "$COMPOSE_PROJECT_NAME"
test "$COMPOSE_PROJECT_NAME" = "$EXPECTED_COMPOSE_PROJECT_NAME"

POSTGRES_CONTAINER_ID="$(docker ps -q --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" --filter label=com.docker.compose.service=postgres)"
REDIS_CONTAINER_ID="$(docker ps -q --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" --filter label=com.docker.compose.service=redis)"
test -n "$POSTGRES_CONTAINER_ID"
test -n "$REDIS_CONTAINER_ID"

DISCOVERED_POSTGRES_VOLUME="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$POSTGRES_CONTAINER_ID")"
DISCOVERED_REDIS_VOLUME="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$REDIS_CONTAINER_ID")"
test "$DISCOVERED_POSTGRES_VOLUME" = "$EXPECTED_POSTGRES_VOLUME"
test "$DISCOVERED_REDIS_VOLUME" = "$EXPECTED_REDIS_VOLUME"
docker volume inspect "$EXPECTED_POSTGRES_VOLUME" "$EXPECTED_REDIS_VOLUME" >/dev/null
```

The discovered project name must also match independently reviewed prior deployment evidence. Record the exact project and volume names before any build, migration, or container recreation. A mismatch is a hard stop.

### 1.4 Verify the environment file without exposing it

```bash
test -f "$PRODUCTION_ENV_FILE"
test ! -L "$PRODUCTION_ENV_FILE"
test "$(stat -c '%U' "$PRODUCTION_ENV_FILE")" = "$EXPECTED_ENV_OWNER"
ENV_MODE="$(stat -c '%a' "$PRODUCTION_ENV_FILE")"
case "$ENV_MODE" in 600|640) ;; *) echo 'STOP: production environment permissions are too broad' >&2; exit 1 ;; esac
```

Do not print, source interactively, diff, hash publicly, commit, or include the environment file in release evidence. This runbook references an approved stable shared path rather than copying the file. If policy requires a copy instead, use an operator-reviewed secure copy that preserves the approved owner and mode, never copy from Git history, and set `PRODUCTION_ENV_FILE` to that restricted copy.

### 1.5 Confirm smoke accounts and maintenance prerequisites

Before proceeding, confirm synthetic or explicitly reviewed accounts/resources for platform administrator, organization proprietor/administrator, scoped manager, scoped finance user, asset owner, verified tenant, outsider, suspended user, and a second organization. Credentials must remain in the approved secret manager. Confirm the maintenance window, operator, reviewer, backup destination, last known-good release SHA/images, and rollback owner.

## 2. Maintenance approval checkpoint

The operator and reviewer must sign off the read-only preflight results before the first filesystem, backup, build, database, or container mutation. Approval must explicitly record:

- `RELEASE_SHA`, canonical repository, and remote-main equality;
- legacy checkout and reconciliation-backup preservation;
- release disk capacity;
- exact Compose project and PostgreSQL/Redis volume names;
- restricted environment-file path, owner, and mode without its contents;
- smoke-account availability and maintenance/rollback owners.

Stop if any item is missing. This checkpoint does not authorize Phase 2 work.

## 3. Create and verify the isolated release checkout

Create source only from the canonical GitHub repository—never from `LEGACY_CHECKOUT`, a local bundle of its worktree, or its uncommitted contents.

```bash
if ! test -e "$RELEASE_DIR"; then
  install -d -m 755 "$RELEASE_ROOT"
  git clone --no-checkout "$CANONICAL_REPOSITORY" "$RELEASE_DIR"
  git -C "$RELEASE_DIR" checkout --detach "$RELEASE_SHA"
fi

cd "$RELEASE_DIR"
test "$(git remote get-url origin)" = "$CANONICAL_REPOSITORY"
test "$(git rev-parse HEAD)" = "$RELEASE_SHA"
test -z "$(git status --porcelain)"
git cat-file -e "$RELEASE_SHA^{commit}"
test -f prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql
test -f docs/PHASE_1_IMPLEMENTATION_REPORT.md
test -f docs/PHASE_1_PRODUCTION_RUNBOOK.md
test "$(shasum -a 256 prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql | awk '{print $1}')" = "$EXPECTED_MIGRATION_SHA256"
test -z "$(find . -path ./.git -prune -o -type f \( -name '*.patch' -o -name '*PRESERVATION*' -o -name '*reconciliation-backup*' \) -print)"
grep -Fxq '.env' .dockerignore
grep -Fxq '.env.*' .dockerignore
```

Expected: detached `HEAD` equals the approved SHA, origin is canonical, the worktree is clean, expected commit/migration/report files exist, build context excludes environment files, and no preserved patch, reconciliation artifact, or legacy modification is present. All later commands run from `RELEASE_DIR`.

## 4. Configuration and authorization preflight from the release

```bash
cd "$RELEASE_DIR"
export APP_ENV_FILE="$PRODUCTION_ENV_FILE"
test "$(git rev-parse HEAD)" = "$RELEASE_SHA"
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml --profile release config --quiet
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml --profile release config --services
docker volume inspect "$EXPECTED_POSTGRES_VOLUME" "$EXPECTED_REDIS_VOLUME" >/dev/null
```

Expected services: `postgres`, `redis`, `api`, `migrate`, `web`, and `worker`. Do not output expanded Compose configuration because it can contain resolved secrets.

Reconfirm the source signs access and refresh tokens with identity/session claims only and resolves current roles/permissions from the database. Inspect only reviewed synthetic tokens without logging them. If an access token, proxy, or external cache authorizes from `SUPER_ADMIN`, `OWNER`, `LANDLORD`, roles, or permissions, require forced reauthentication after backup and before reopening traffic. With a separately reviewed database session, revoke active sessions in one audited transaction:

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

Record only the affected-session count. Verify old access/refresh tokens return 401 and require users to sign in again. If token behavior cannot be determined, forced reauthentication is a release gate.

## 5. PostgreSQL backup and optional restore test

```bash
cd "$RELEASE_DIR"
install -d -m 700 /opt/rentalos/backups
export BACKUP_PATH="/opt/rentalos/backups/noagent4u-before-phase1-${BACKUP_TIMESTAMP}.dump"
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_PATH"
test -s "$BACKUP_PATH"
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml exec -T postgres sh -c 'pg_restore --list' < "$BACKUP_PATH" >/dev/null
```

Record the restricted backup path, byte size, private checksum, database host, and operator without committing the archive or sensitive values. `pg_restore --list` proves readability only.

When approved and capacity permits, perform a full restore test using a uniquely named isolated temporary database. Confirm no application points to it, run reviewed integrity checks, and drop only that exact database:

```bash
cd "$RELEASE_DIR"
export RESTORE_TEST_DB="phase1_restore_${BACKUP_TIMESTAMP}"
test "$RESTORE_TEST_DB" != "$EXPECTED_PRODUCTION_DB_NAME"
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$RESTORE_TEST_DB"
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$1" --exit-on-error --no-owner --no-privileges' sh "$RESTORE_TEST_DB" < "$BACKUP_PATH"
# Run reviewed row-count and integrity checks against only "$RESTORE_TEST_DB".
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" "$1"' sh "$RESTORE_TEST_DB"
```

Record whether the full restore passed or was explicitly deferred, including the reviewer accepting that residual risk.

## 6. Build and verify immutable images

Reconfirm volumes immediately before building:

```bash
cd "$RELEASE_DIR"
test "$(git rev-parse HEAD)" = "$RELEASE_SHA"
docker volume inspect "$EXPECTED_POSTGRES_VOLUME" "$EXPECTED_REDIS_VOLUME" >/dev/null
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml --profile release build migrate api worker web
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml images

for image in \
  "noagent4u-api:$RELEASE_SHA" \
  "noagent4u-web:$RELEASE_SHA" \
  "noagent4u-worker:$RELEASE_SHA" \
  "noagent4u-migrate:$RELEASE_SHA"; do
  test "$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.source" }}' "$image")" = 'https://github.com/corusinfo-tech/rental-management-platform'
  test "$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image")" = "$RELEASE_SHA"
  docker image inspect --format 'image={{.RepoTags}} id={{.Id}} digests={{.RepoDigests}} revision={{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image"
done
```

Record all SHA-qualified tags, OCI labels, image IDs, and registry digests where available. Do not remove previous images or the last known-good release.

## 7. Migration status and execution

```bash
cd "$RELEASE_DIR"
docker volume inspect "$EXPECTED_POSTGRES_VOLUME" "$EXPECTED_REDIS_VOLUME" >/dev/null
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml --profile release run --rm migrate /app/node_modules/.bin/prisma migrate status --schema prisma/schemas
```

Expected before migration: up to date or only the reviewed Phase 1 migration pending. Stop for drift, failed/unknown migrations, an unexpected database, project-name mismatch, or volume mismatch.

After explicit migration approval:

```bash
cd "$RELEASE_DIR"
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml --profile release run --rm migrate /app/node_modules/.bin/prisma migrate deploy --schema prisma/schemas
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml --profile release run --rm migrate /app/node_modules/.bin/prisma migrate status --schema prisma/schemas
```

Migration must exit zero and final status must be up to date before application deployment.

## 8. Application deployment

```bash
cd "$RELEASE_DIR"
test "$(git rev-parse HEAD)" = "$RELEASE_SHA"
docker volume inspect "$EXPECTED_POSTGRES_VOLUME" "$EXPECTED_REDIS_VOLUME" >/dev/null
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml up -d --no-deps api worker
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml up -d --no-deps web
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml ps
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml images
```

Expected: the unchanged Compose project uses the existing production volumes and the inspected SHA-qualified API, worker, and web images. Never use `down -v`.

## 9. Health, logs, and authenticated smoke tests

```bash
cd "$RELEASE_DIR"
curl --fail --silent --show-error http://127.0.0.1:3001/health
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml ps
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$PRODUCTION_ENV_FILE" -f docker-compose.production.yml logs --since=15m --no-color api worker web
```

Logs must show no migration, Prisma, authorization, unhandled-exception, restart-loop, database, or Redis errors. Use only designated smoke accounts and keep tokens out of shell history and evidence.

| Check | Expected result |
| --- | --- |
| Settings read and concurrent initialization | 200; exactly one settings row |
| Platform administrator platform endpoint | 200 |
| Platform administrator organization workspace without membership | 403 |
| Organization proprietor/admin own organization | 200; organization-wide portfolio |
| Scoped manager assigned versus unassigned/foreign property | 200 versus 403 |
| Scoped finance assigned invoice/payment versus property management | 200 versus 403 |
| Asset owner owned/assigned versus unowned property | 200 versus 403 |
| Verified tenant linked versus unlinked lease/payment allocation | 200 versus 403 |
| Outsider, suspended principal, or revoked assignment | 403 |
| Direct second-organization resource attempt | 403 |
| Ambiguous/multi-property historical payment for scoped user | 403 or omitted |

Verify identifiers in allowed lists, not only status codes. Denials must not disclose whether a foreign resource exists.

## 10. Database invariants and completion evidence

With an approved read-only session, record counts—not row contents—showing one settings row per active organization; expected active platform principals; no cross-organization portfolio assignment, tenant link, or payment property; and denial of ambiguous/unmatched historical payments.

Record the immutable release directory/SHA, canonical-origin proof, clean detached `HEAD`, preserved legacy-checkout evidence, reconciliation-backup presence, unchanged Compose project and volume names, restricted environment-file owner/mode confirmation without its path contents, backup evidence, migration status, image tags/IDs/digests/labels, container status, health/log results, session-revocation decision, and redacted smoke matrix. Never include secrets, tokens, database URLs, personal data, environment contents, backup contents, or preserved patches.

## 11. Rollback and forward-fix conditions

- **Before migration:** abort without changing application containers if source, preservation, identity, volume, environment, backup, build, provenance, or migration-status verification fails.
- **Migration fails:** do not deploy new application containers. Preserve logs and snapshot; use reviewed Prisma failed-migration recovery or an additive forward migration—never reset production.
- **Application fails before Phase 1-only writes:** redeploy the recorded last known-good SHA-qualified images using the same Compose project and volumes while retaining the additive schema.
- **Phase 1-only writes occurred:** prefer a reviewed forward fix; do not deploy an incompatible older image.
- **Authorization or cross-organization smoke test fails:** remove public traffic from the affected service, preserve evidence, revoke sessions if required, and forward-fix before reopening.
- **Backfill is incorrect:** use an audited idempotent forward migration; do not drop Phase 1 structures.

Keep `LEGACY_CHECKOUT`, `RECONCILIATION_BACKUP`, previous immutable release directories, previous images, and both production volumes until rollback is formally closed. Do not mutate the legacy checkout as part of rollback.

Production deployment requires a separate explicit approval. This runbook does not authorize executing any server, deployment, database, or migration command.
