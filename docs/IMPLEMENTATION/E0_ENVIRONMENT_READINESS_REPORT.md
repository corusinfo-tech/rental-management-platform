# E0 — Environment Readiness Report

**Status: Prepared for verification planning; no installation, container,
migration, test, build, or deployment was executed.**

## Repository audit

| Item | Status | Notes |
| --- | --- | --- |
| Root `package.json` | Present | pnpm/Turbo workspace root. |
| `pnpm-workspace.yaml` | Present | Includes API, web, worker, scheduler, and all declared packages. |
| `pnpm-lock.yaml` | Present | Required for deterministic `--frozen-lockfile` installation. |
| `turbo.json` | Present | Defines build, dev, lint, typecheck, test, and clean tasks. |
| Local compose | Present | `docker-compose.yml` includes infrastructure services only. |
| Production compose | Present | `docker-compose.production.yml` includes API/web/PostgreSQL/Redis. |
| API Dockerfile | Present | `apps/api/Dockerfile`. |
| Web Dockerfile | Present | `apps/web/Dockerfile`. |
| Worker Dockerfile | Missing | No `apps/worker/Dockerfile` exists. |
| Scheduler Dockerfile | Missing | No scheduler execution artifact exists. |
| Prisma schema | Present | Multi-file schema directory with `schema.prisma` datasource/generator anchor. |
| Prisma migrations | Present | Ordered timestamped SQL migrations through O1 hardening. |
| Prisma seed | Present | `prisma/seed/identity.js` seeds standard permissions and roles. |

## Missing files and configuration

- **Worker Dockerfile and runnable worker entrypoint:** required for an
  end-to-end outbox-worker verification or VPS deployment. Do not treat the
  worker package alone as an operational service.
- **Scheduler Dockerfile/entrypoint:** required if scheduler work is intended
  to run outside local development.
- **Test-only compose profile/override:** required to isolate PostgreSQL data,
  Redis keys, ports, and destructive cleanup from developer state.
- **Repository `prisma` script configuration:** root scripts do not currently
  provide standard `verify`, `migrate`, or `seed` commands.
- **CI database/Redis services and migration stages:** absent from current CI.
- **`AGENTS.md` and Engineering Handbook:** not present in this worktree; their
  environment requirements cannot be checked.

## Required tools and package manager

The repository declares Node `>=20.9.0`, pnpm `11.7.0`, and TurboRepo. CI
currently installs pnpm 9, which should be aligned with the root package-manager
declaration before it is relied upon as a reproducible gate. Prisma is a root
development dependency (`^6.1.0`) and is invoked through `pnpm prisma` after a
locked install.

### Local installation

```bash
corepack enable
corepack prepare pnpm@11.7.0 --activate
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm prisma --version
```

Use a supported Node 22 LTS release for parity with the Dockerfiles. Do not use
global Prisma or a globally installed pnpm to bypass the workspace lockfile.

## Docker review

### Local compose

`docker-compose.yml` provides:

- PostgreSQL 16 (`postgres:16-alpine`) with a health check and persistent
  volume.
- Redis 7 (`redis:7-alpine`) with a health check and persistent volume.
- Mailpit with SMTP/UI ports and health check.
- pgAdmin and MinIO for local administration/storage development.

It does **not** provide API or worker containers, so it cannot by itself prove
application startup, Swagger/API health, or outbox delivery. This is acceptable
for its current stated infrastructure-only scope, but not sufficient for full
O1 verification.

### Production compose

`docker-compose.production.yml` declares API and web containers as well as
PostgreSQL and Redis. It has these readiness concerns:

- It lacks a worker service.
- It lacks an API health check and does not run migrations as a deliberate
  release step.
- Its PostgreSQL defaults still use `rentalos`, inconsistent with the
  NoAgent4U naming used elsewhere.
- It relies on `.env.production`, which must be supplied only through an
  approved secret-management/deployment process.

No compose configuration was modified in E0.

## Environment variables

`.env.example` has been made secret-free and now documents API, JWT,
verification encryption, registration throttling, PostgreSQL, Redis, Mailpit,
SMTP, administration, MinIO, and test-only connection variables. It uses only
`REPLACE_WITH_*` placeholders for secret material.

Required API startup values are derived from
`apps/api/src/config/environment.ts`: `DATABASE_URL`, `REDIS_URL`, access and
refresh JWT secrets, issuer, audience, algorithm, registration throttle secret,
verification encryption key, and verification key version. Numeric security
settings have documented defaults but should be explicitly set in VPS/CI
configuration. SMTP fields are required when the SMTP provider is wired.

## Database review

Prisma uses a multi-file schema layout under `prisma/schemas/`, anchored by
`schema.prisma` with PostgreSQL datasource URL `DATABASE_URL`. Migration names
sort chronologically from Identity foundation through
`20260714170000_organization_hardening`; ordering is suitable for `migrate
deploy` but has not been executed in this environment.

The seed strategy is idempotent upsert of standard permissions and global system
roles only. It does not create real users or organizations. Verify that Prisma
seed invocation is configured and executable in the restored dependency
environment before depending on `pnpm prisma db seed`.

## Deployment checklist

### Local development

1. Install locked dependencies using Corepack/pnpm 11.7.0.
2. Copy `.env.example` to `.env`; generate local secrets and set disposable
   local database/Redis endpoints.
3. Start only local infrastructure with `docker compose up -d postgres redis
   mailpit` and wait for health checks.
4. Run Prisma generation, migrations, and seed against the intended local
   database.
5. Run `pnpm dev`; API and worker require separate runnable services before
   end-to-end delivery can be asserted.

### VPS deployment

1. Provision TLS reverse proxy, firewall, non-root service account, Docker,
   backups, log rotation, and a secret-management path.
2. Supply `.env.production` out of band; never copy `.env.example` unchanged
   and never commit production values.
3. Build immutable API/web/worker images from the locked workspace.
4. Apply migrations as a separately logged, pre-release step against a backed-up
   database.
5. Start API, web, worker, PostgreSQL, and Redis; require health checks and
   monitor worker dead letters, database capacity, Redis memory, and API errors.
6. Verify `/health`, Swagger access policy, background worker polling, backups,
   and rollback plan before traffic cutover.

### CI pipeline

1. Use pnpm 11.7.0 and Node 22 LTS.
2. Install with `--frozen-lockfile`.
3. Run Prisma format/validate/generate.
4. Start disposable PostgreSQL 16 and Redis 7 services; wait for health.
5. Apply migrations, execute seed, inspect constraints, and perform the approved
   rollback rehearsal.
6. Run typecheck, lint, unit tests, PostgreSQL/Redis integration tests, worker
   tests, and build.
7. Upload redacted logs and test/migration artifacts; reject skipped mandatory
   integration suites.

### Rollback

Use a release-specific, approved rollback runbook. Before migration deployment,
take a tested PostgreSQL backup/snapshot and record schema migration state. Do
not use `prisma db push` or destructive database reset in VPS/production.
Database rollback must be rehearsed against a disposable copy; application-image
rollback alone is insufficient after an incompatible migration.

## Recommended standard scripts (not applied)

| Script | Recommended implementation |
| --- | --- |
| `pnpm dev` | Existing `turbo run dev --parallel`; add worker/scheduler runnable tasks when entrypoints exist. |
| `pnpm test` | Existing `turbo run test`; CI must make required integration suites non-skippable. |
| `pnpm verify` | `bash scripts/verify-o1.sh` or a generalized verified environment runner. |
| `pnpm build` | Existing `turbo run build`. |
| `pnpm migrate` | `prisma migrate deploy --schema prisma/schemas`. |
| `pnpm seed` | `prisma db seed --schema prisma/schemas`, once the Prisma seed command is verified. |

## Verification checklist

- [ ] Locked install, Node, pnpm, and Prisma versions recorded.
- [ ] Compose health evidence for PostgreSQL, Redis, and Mailpit captured.
- [ ] Clean migration, seed, constraints, and rollback rehearsal captured.
- [ ] API and worker containers/entrypoints available for end-to-end testing.
- [ ] Typecheck, lint, all tests, worker tests, and build executed.
- [ ] Redis isolation and TTL/failure-mode evidence captured.
- [ ] O1 verification checklist/evidence templates completed.
- [ ] CI stages and artifacts configured and green.

## Known risks

- Dependencies, Docker, Prisma, migrations, tests, and builds were not run in
  this environment; no verification result is implied.
- Local compose persistent volumes make destructive test cleanup unsafe without
  an isolated test profile.
- Missing worker deployment artifact prevents operational outbox verification.
- Production compose naming drift (`rentalos`) risks incorrect database defaults.
- Prisma seed configuration has not been proven by execution.
- Platform administrator and worker operational risks documented in O1 remain
  open until their ADR and live verification work are completed.

## Recommended next steps

1. Restore network/package cache, Node, pnpm 11.7.0, and Docker Desktop.
2. Create an approved test-only compose profile plus API/worker verification
  services; do not change production compose as part of this step.
3. Add the recommended root scripts and align CI pnpm version in a dedicated
  reviewed infrastructure change.
4. Create worker Dockerfile/entrypoint and add it to VPS deployment only after
  worker startup and outbox tests pass.
5. Run `bash scripts/verify-o1.sh` with explicit disposable URLs and populate
  the O1 evidence template before requesting a new Gate O1 review.
