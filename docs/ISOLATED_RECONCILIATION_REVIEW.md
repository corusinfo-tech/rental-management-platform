# Isolated Reconciliation Review

## Decision

**READY FOR DRAFT PR. NOT READY FOR MERGE.**

Docker migration-image validation is pending in GitHub Actions. A focused pull-request merge gate now builds and inspects only the migration target, performs database-free checks with container networking disabled, and verifies the Compose release profile using synthetic CI-only values. No merge should occur until that workflow completes successfully.

## Source and evidence verification

- Repository: `corusinfo-tech/rental-management-platform`
- Canonical starting SHA: `dd376fab92dce6b6a29a0dac67eff2adf923ce10`
- Review branch: `reconcile/production-runner-fixes`
- The branch was created directly from the canonical starting SHA.
- Preserved patch SHA-256 expected: `375375197cf009c2d80962124a7a26880a259cdee4476af4470d0f745348afe5`
- Preserved patch SHA-256 calculated: `375375197cf009c2d80962124a7a26880a259cdee4476af4470d0f745348afe5`
- Checksum result: **PASS**
- Patch scope: exactly `apps/api/Dockerfile`, `docker-compose.production.yml`, and `package.json`
- Sensitive-content review: **PASS**. The patch contains no credentials, secret values, environment values, or production application data.
- The preserved patch, checksum manifest, and server report are not included in this repository diff.

## Independent change decisions

### `apps/api/Dockerfile`

Decision: **ACCEPT FOR DRAFT REVIEW; MERGE-BLOCKED PENDING IMAGE VALIDATION**

The final diff replaces `pnpm exec prisma` with the explicit repository binary `/app/node_modules/.bin/prisma`. The migration target inherits the build stage, where the frozen dependency installation includes the Prisma CLI before the repository source, schemas, and committed migrations are copied into the image.

Local validation proved that `./node_modules/.bin/prisma --version` runs Prisma 6.19.3 directly, loads `prisma.config.ts`, and loads the multi-file schema from `prisma/schemas`. The repository contains 10 committed schema files and 26 committed migration files. The explicit path cannot invoke dynamic package installation.

The patch's commented troubleshooting lines were removed, leaving only the one-line command change. The target image itself could not be built in this environment, so this change is not approved for merge yet.

### `docker-compose.production.yml`

Decision: **REJECT**

The preserved patch disabled `profiles: ['release']`. That change was not applied. The migration service remains gated behind the `release` profile, so normal `docker compose up` cannot include it automatically.

### `package.json`

Decision: **ACCEPT**

The `packageManager` declaration is pinned to pnpm 11.15.0 with its integrity hash. Temporary, locally scoped Corepack 0.34.0 recognized the declaration and selected pnpm 11.15.0. No system-wide pnpm or Corepack installation was performed.

The frozen-lockfile installation succeeded. `pnpm-lock.yaml` remained byte-identical with SHA-256 `a8ec13326e61e501d26599e6b276d0e399cd9153ebe1d11ea000cf7422051f37`.

## Final recommended source diff

- `apps/api/Dockerfile`: use `/app/node_modules/.bin/prisma` in the migration target.
- `package.json`: integrity-pin pnpm 11.15.0.
- `docker-compose.production.yml`: unchanged; retain `profiles: ['release']`.
- `docs/ISOLATED_RECONCILIATION_REVIEW.md`: record this isolated review.

No troubleshooting comments or preserved evidence artifacts are included.

## Validation results

All package commands used the integrity-pinned pnpm 11.15.0 selected through locally scoped Corepack.

| Validation                       | Result | Evidence summary                                                                                              |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `git diff --check`               | PASS   | No whitespace errors                                                                                          |
| `pnpm install --frozen-lockfile` | PASS   | 13 workspace projects; frozen lockfile accepted                                                               |
| Lockfile unchanged               | PASS   | No Git diff; SHA-256 unchanged                                                                                |
| `pnpm typecheck`                 | PASS   | 12/12 tasks successful                                                                                        |
| `pnpm lint`                      | PASS   | 12/12 tasks successful, zero warnings treated as errors                                                       |
| `pnpm test`                      | PASS   | 12/12 workspace tasks successful after rerun with permission for the worker's local ephemeral health listener |
| `pnpm build`                     | PASS   | 12/12 tasks successful; production web build completed                                                        |
| Direct Prisma binary             | PASS   | Prisma 6.19.3 ran from `./node_modules/.bin/prisma`; no dynamic package installation                          |

The successful test run reported 110 passing executable tests and 3 database-dependent skips: two suites require `IDENTITY_TEST_DATABASE_URL`, and one API suite requires `PHASE1_API_TEST_DATABASE_URL`. No database URL was supplied because this review was intentionally isolated.

The initial sandboxed test attempt was invalidated by a local socket-permission denial. The identical test command passed when rerun with permission to open only its ephemeral local health-check listener.

## Docker validation

Status: **PENDING GITHUB ACTIONS RESULT — MERGE BLOCKER**

- Docker CLI found: version 29.6.1.
- Docker Compose plugin: unavailable.
- Docker daemon: unavailable.
- No Docker installation or system configuration was changed.
- No image was built because the required migration target could not be validated with the unavailable Docker runtime.
- No container was started.
- No database was created or contacted.
- No migration status or deployment command was executed.
- The pull-request-only `migration-image-merge-gate` job was added to `.github/workflows/ci.yml`.
- The job builds only the `migrate` target and tags it with the tested GitHub commit SHA.
- It verifies the image command, Prisma 6.19.3, `prisma.config.ts`, and the exact committed schema and migration file lists.
- Every executable container check uses `--network none` and never invokes a migration or database command.
- Compose validation uses a temporary ignored copy of `.env.production.example`, does not print rendered configuration, verifies the `release` profile and service selection, and deletes temporary files on exit.

Do not claim Docker validation PASS until this job succeeds for the PR head.

## Database-dependent test disposition

The three locally skipped database entry points were inspected:

- `tests/identity-database.test.mjs`
- `tests/phase1-database.test.mjs`
- `apps/api/test/phase1-database.integration.test.mjs`

They validate persisted identity behavior, Phase 1 schema constraints and authorization behavior. Neither the Docker migration command path nor the package-manager declaration changes schema, migrations, generated Prisma code, repositories, services, or authorization logic. They are therefore unrelated to this narrowly scoped reconciliation diff.

The canonical Phase 1 implementation report already records the relevant database validation against disposable PostgreSQL: 24 migrations applied from empty, representative pre-Phase-1 upgrade validation, and 21 database integration tests passed with 0 failures and 0 skips. The skipped suites are not weakened, deleted, or represented as passing in this review; rerunning them is outside this runner-only merge gate.

## Isolation and safety confirmation

- No production system, server, database, container, environment file, secret, or application data was accessed.
- The legacy `rental-management-app` repository was not accessed or modified.
- The canonical `main` branch was not modified.
- No deployment or migration is authorized by this review.
- The evidence files remain outside the repository and are not staged for commit.

## Remaining blockers

1. Obtain a successful GitHub Actions result for the new migration-image and Compose release-gate job on the exact PR head.
2. After recording that run in this report, rerun CI on the report-only commit and require another successful result.

The branch is suitable for a draft pull request only. It is **not ready for merge**.
