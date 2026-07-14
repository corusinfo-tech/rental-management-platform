# E1.1 — Development & Deployment Platform Report

**Status: Infrastructure prepared; not verified or deployed.**

No business-domain code was added or changed. Docker, scripts, root command
aliases, and documentation were prepared for repeatable local and CI
verification. Commands and containers were not executed in this environment.

## Architecture

```text
Local / CI verification
  └─ docker-compose.test.yml (isolated test network)
       ├─ PostgreSQL 16 (tmpfs data)
       ├─ Redis 7 (no persistence)
       ├─ Mailpit
       ├─ MinIO
       ├─ API (health endpoint)
       └─ Worker verification job

VPS deployment (existing production compose)
  ├─ PostgreSQL
  ├─ Redis
  ├─ API
  └─ Web
```

The scheduler package has no source files, executable entrypoint, or runtime
contract. No scheduler Dockerfile or compose service was created; this is an
intentional absence, not an omitted production service.

## Docker

### Added

- `apps/worker/Dockerfile` builds a locked Node 22/pnpm 11.7 workspace image,
  generates Prisma client code, and executes the worker package's one-shot test
  command.
- `docker-compose.test.yml` provides a test-only PostgreSQL 16, Redis 7,
  Mailpit, MinIO, API, and worker verification job on an isolated named network.
- Test PostgreSQL uses `tmpfs`; Redis disables persistence. Host ports are
  separated from the development defaults.
- Health checks are defined for PostgreSQL, Redis, Mailpit, MinIO, and API.

### Worker health limitation

The Worker package has library code but no approved long-running entrypoint,
HTTP health endpoint, or provider/bootstrap composition. Its compose service is
therefore a one-shot `verification-jobs` profile, not a runtime delivery worker.
It cannot truthfully have a process health check yet. A worker bootstrap and its
real readiness semantics require a separate reviewed platform story.

## Scripts and root commands

| Artifact | Purpose |
| --- | --- |
| `scripts/bootstrap.sh` | Activates pnpm 11.7.0 through Corepack, restores the frozen lockfile, reports Prisma CLI availability, and validates test compose syntax. |
| `scripts/reset-test-db.sh` | Refuses URLs not containing `test`, then destructively resets and seeds only the named disposable test database. |
| `scripts/verify.sh` | Starts the disposable compose stack, resets the test database, runs O1 verification, runs the worker verification job, and removes test resources on exit. |
| `scripts/verify-o1.sh` | Runs Prisma format/validate/generate, migration deploy, seed, typecheck, lint, tests, worker tests, and build; stops on first failure. |
| `pnpm verify` | Calls `bash scripts/verify.sh`. |
| `pnpm migrate` | Calls `prisma migrate deploy --schema prisma/schemas`. |
| `pnpm seed` | Calls `prisma db seed --schema prisma/schemas`. |

All workspace packages already declare `build`, `test`, `typecheck`, and `lint`
scripts. This was confirmed statically; none were executed.

## CI proposal (not applied)

The existing workflow remains unchanged. Replace or extend it in a dedicated CI
change with this matrix/job design:

```yaml
strategy:
  matrix:
    node: [22]
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4
    with: { version: 11.7.0 }
  - uses: actions/setup-node@v4
    with: { node-version: ${{ matrix.node }}, cache: pnpm }
  - run: pnpm install --frozen-lockfile
  - run: pnpm prisma format --schema prisma/schemas
  - run: pnpm prisma validate --schema prisma/schemas
  - run: pnpm prisma generate --schema prisma/schemas
  - run: pnpm migrate
  - run: pnpm seed
  - run: pnpm typecheck
  - run: pnpm lint
  - run: pnpm test
  - run: pnpm --filter @noagent4u/worker test
  - run: pnpm build
```

The CI job must add PostgreSQL 16 and Redis 7 service containers, set only test
connection values, wait for health, execute migration/seed/approved rollback,
and archive redacted logs. It must reject skipped required database or Redis
integration suites. The current CI pnpm 9 setting is not aligned with the root
`packageManager` declaration and should be updated to pnpm 11.7.0.

## Local development

```bash
bash scripts/bootstrap.sh
cp .env.example .env
# Fill only local untracked values.
pnpm verify
```

`pnpm verify` creates/removes the disposable test stack. Normal local
development infrastructure remains `docker compose up` and must use separate
ports/volumes from `docker-compose.test.yml`.

## VPS deployment

1. Provision Docker, a reverse proxy/TLS layer, firewall, backups, log rotation,
   non-root service account, and secret-management/deployment path.
2. Supply `.env.production` outside version control with production-only values.
3. Build immutable API/web/worker images from the frozen lockfile.
4. Back up PostgreSQL and record migration state before applying migrations.
5. Apply `pnpm migrate` as a separate, logged release step.
6. Start API/web/worker only after database/Redis health checks; verify API
   health and background-worker readiness.
7. Monitor API errors, worker dead letters, PostgreSQL capacity/backups, Redis
   memory, and image/container health.

The existing production compose file does not yet satisfy the worker portion of
this plan and retains legacy `rentalos` database defaults. These require a
dedicated reviewed deployment follow-up.

## Rollback and recovery

- Never use `prisma db push`, `migrate reset`, or the test reset script against
  VPS/production.
- Take a tested database backup/snapshot before migration deployment.
- Roll back application images only when the corresponding database migration is
  backward compatible; otherwise execute the approved database rollback runbook
  against a rehearsed restore point.
- Preserve migration logs, image digests, environment version, and health data
  for incident recovery.
- For test failures, `scripts/verify.sh` tears down only the test compose stack
  and volumes through its exit trap.

## Known risks

1. Docker, Node, pnpm dependency installation, Prisma, migrations, health
   checks, scripts, tests, and builds were not run here; no success is claimed.
2. The worker Dockerfile is verification-only until a real worker bootstrap and
   health endpoint are approved and implemented.
3. The scheduler is intentionally omitted because it has no runtime code.
4. Test compose includes fixed disposable credentials; it must never be used for
   a shared or persistent environment.
5. Production compose still has no worker service, API health check, migration
   release job, or corrected NoAgent4U database defaults.
6. `AGENTS.md` and the Engineering Handbook are unavailable in this worktree,
   so their environment-specific requirements remain unverified.

## Next steps

1. Restore a networked Node/pnpm/Docker environment and run `pnpm verify`.
2. Populate the O1 verification evidence template with command outputs,
   migration/rollback evidence, and worker results.
3. Implement the approved worker bootstrap before adding it as a VPS runtime
   service or claiming worker health coverage.
4. Create scheduler runtime artifacts only after scheduler behavior is defined.
5. Apply the CI proposal and production compose corrections through separate
   reviewed infrastructure changes.
