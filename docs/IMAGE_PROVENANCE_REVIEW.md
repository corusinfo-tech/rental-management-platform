# Image Provenance Review

Status: **READY FOR REVIEW**, with merge blocked until the GitHub Actions provenance gate passes for the exact pull-request head.

## Scope

- Canonical repository: `https://github.com/corusinfo-tech/rental-management-platform.git`
- Canonical base: `main` at `a2d49ccb42ce3d9a7fb9fb0fd4f8adabf050e8e8`
- Review branch: `release/add-image-provenance`
- Production systems accessed: **none**
- Production deployment or migration performed: **none**

The safe local switch fast-forwarded the clean local `main` to the canonical base. The retained `reconcile/production-runner-fixes` branch remains unchanged locally and remotely at `ba6b198d6791dbb4b15d2d59cceaa633c485fd80`.

## Files changed

- `.dockerignore`
- `.env.production.example`
- `.github/workflows/ci.yml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/worker/Dockerfile`
- `docker-compose.production.yml`
- `docs/PHASE_1_PRODUCTION_RUNBOOK.md`
- `docs/IMAGE_PROVENANCE_REVIEW.md`

## Provenance design

Each final application image receives an explicit `RELEASE_SHA` Docker build argument. Dockerfile validation rejects values that are not exactly 40 lowercase hexadecimal characters. Final API, web, worker, and migration images expose:

```text
org.opencontainers.image.source=https://github.com/corusinfo-tech/rental-management-platform
org.opencontainers.image.revision=<RELEASE_SHA>
```

The migration target inherits the validated labels from the API build stage. The API runtime redeclares and validates the argument because it starts from a fresh runtime base. Web and worker runtime stages do the same.

Compose assigns these immutable release tags:

```text
noagent4u-api:<RELEASE_SHA>
noagent4u-web:<RELEASE_SHA>
noagent4u-worker:<RELEASE_SHA>
noagent4u-migrate:<RELEASE_SHA>
```

Every tag and build argument uses required interpolation, so Compose configuration fails when `RELEASE_SHA` is absent. The optional `APP_ENV_FILE` selector defaults to `.env.production`; it exists only to let CI and local validation select `.env.production.example` without creating or reading a production environment file. Production behavior remains unchanged when the selector is unset.

## Compose release gate

Static Compose validation with the synthetic SHA `1111111111111111111111111111111111111111` passed:

- missing `RELEASE_SHA` was rejected;
- default service selection was `postgres`, `redis`, `api`, `web`, and `worker`;
- `--profile release` additionally selected `migrate`;
- `migrate.profiles` remained exactly `["release"]`;
- all rendered image tags and Docker build arguments matched the synthetic SHA;
- service names, project behavior, networks, volumes, database/Redis images, ports, health checks, and restart policies were not renamed or otherwise changed.

The migration command remains exactly:

```text
/app/node_modules/.bin/prisma migrate deploy --schema prisma/schemas
```

## Build-context protection

`.dockerignore` continues to exclude `.git`, `.env`, `.env.*`, dependency/build outputs, and legacy upload directories. It now also excludes common private-key and secret-directory patterns. `.env.production.example` contains only a documented all-zero placeholder for `RELEASE_SHA`; no real environment file was created or committed.

## CI merge gate

The existing read-only pull-request merge-gate job now:

1. checks out the exact pull-request head SHA;
2. proves the checked-out revision equals the 40-character `RELEASE_SHA`;
3. verifies Compose fails without that SHA;
4. builds API, web, worker, and migration images from that SHA;
5. verifies all four SHA-qualified tags and exact OCI source/revision labels;
6. verifies the exact migration command and committed Prisma schemas/migrations;
7. runs executable image inspections only with `--network none`;
8. verifies default and release-profile service selection;
9. never starts the application stack or contacts a database.

Job permissions remain `contents: read`, and only synthetic example values are used.

## Validation results

| Check | Result |
| --- | --- |
| `git diff --check` | Pass |
| `pnpm install --frozen-lockfile` | Pass; local bundled pnpm 11.9.0 |
| `pnpm-lock.yaml` checksum/status | Unchanged (`a8ec13326e61e501d26599e6b276d0e399cd9153ebe1d11ea000cf7422051f37`) |
| `pnpm typecheck` | Pass; 12/12 workspace tasks |
| `pnpm lint` | Pass; 12/12 workspace tasks |
| `pnpm test` | Pass outside the port-restricted sandbox; 12/12 workspace tasks |
| Test reporters | 110 passed, 3 database-configured tests skipped, 0 failed |
| `pnpm build` | Pass; 12/12 workspace tasks |
| CI workflow YAML parse | Pass |
| Compose fail-closed/profile/tag/build-argument assertions | Pass |
| Local four-image build and image inspection | Blocked by local Colima capacity; see below |

The first concurrent typecheck/test attempt raced with Next.js regenerating `.next/types`; both commands passed when rerun sequentially after the successful build. The first sandboxed test attempt could not bind the worker's localhost health port; the exact suite passed when rerun with local port access.

Three database-dependent tests were skipped because no integration database URL was supplied. This change does not alter schemas, migrations, repositories, authorization behavior, or generated Prisma code. The previously accepted Phase 1 database validation remains separate from this database-free provenance gate.

Docker reached the pinned Corepack package manager (`pnpm 11.15.0`) and completed frozen-lockfile installation in the API/migration, worker, and web build paths. The concurrent legacy-builder run then stalled while committing large layers because the existing local Colima disk was 89% full. The run was interrupted without starting any service, database, or migration command. Only the three exited intermediate containers created by that attempt were removed; pre-existing images, containers, and volumes were left untouched. Full image/tag/label/command validation is therefore delegated to the mandatory clean GitHub-hosted merge gate.

## Runbook changes

The production runbook now requires:

- a complete 40-character release SHA;
- exact equality between `RELEASE_SHA`, the approved SHA, and checked-out Git `HEAD`;
- SHA-qualified application image tags;
- exact OCI source and revision labels;
- capture of image IDs, tags, and registry digests where available;
- preservation of the existing Compose project name and named production volumes.

## Security and data review

The final source diff contains no credentials, tokens, real environment values, production data, database URLs, personal data, or local absolute paths. No VPS, production database, production container, production environment file, upload, secret, or application data was accessed.

## Remaining gate

The draft pull request must remain unmergeable until the GitHub Actions `verify` and extended `migration-image-merge-gate` jobs pass for its exact head SHA. A failed or cancelled provenance job is a release blocker.

Final disposition: **READY FOR REVIEW**. Deployment, migration, merge, and production synchronization remain separately unauthorized.
