# Gate O1 — Verification Execution Plan

**Status: NOT EXECUTED.** This plan is a QA execution aid only. It does not claim that Gate O1 has passed or that any command has succeeded.

## Entry criteria and required software

- Clean working tree or an explicit decision to preserve current changes. The current verification runner invokes `prisma format`, which can modify files.
- Node 22 LTS, Corepack, pnpm 11.7.0, Git, Bash 4+, and Docker Compose v2.
- Network or an approved package cache sufficient for `pnpm install --frozen-lockfile` and Docker image builds.
- Docker resources for PostgreSQL 16, Redis 7, Mailpit, MinIO, API, and Worker images.
- No development, staging, or production connection URL, credentials, Docker project, or volume in the active shell.
- A designated QA operator and writable redacted-log location.

## Asset review and pre-execution holds

### Scripts

| Asset | Assessment | Required execution control |
| --- | --- | --- |
| `bootstrap.sh` | Frozen install and Compose syntax check. Depends on Corepack and network/cache. | Record Node/pnpm/Prisma versions and installation log. |
| `reset-test-db.sh` | Destructive by design. Its `*test*` URL guard is helpful but not a production safety boundary. | Manually inspect complete target URL/Docker project; require second-person confirmation on shared hosts. |
| `verify-o1.sh` | Fail-fast and forces Prisma to use `IDENTITY_TEST_DATABASE_URL`. Migration and seed duplicate reset work. | Capture both reset and deploy/seed outputs as idempotency evidence. |
| `verify.sh` | Starts stack, resets DB, starts Worker, verifies, and removes test volumes on exit. | Do not run concurrently; export logs before cleanup removes resources. |

**Format hold:** `pnpm prisma format --schema prisma/schemas` mutates files. Before execution, either approve any formatting diff or use a repository-approved non-mutating format check. Any verification-created source diff requires review.

### Docker

`docker-compose.test.yml` supports PostgreSQL 16, Redis 7, Mailpit, MinIO, API, and Worker. PostgreSQL uses tmpfs and Redis disables persistence. Scheduler is absent because the package has no runnable implementation.

`docker-compose.production.yml` supports PostgreSQL, Redis, API, Worker, and Web. Mailpit is intentionally test-only; production requires approved SMTP configuration. Production compose is not a Gate O1 test target.

Pre-execution concerns:

- Test API starts before migration; its `/health` endpoint is process health, not database readiness. Migrate/reset before calling API integration-ready.
- Production `DATABASE_URL` and `REDIS_URL` must resolve `postgres`/`redis` inside Compose, not `localhost`.
- Worker readiness becomes meaningful only after migration creates `OutboxEvent`.
- No scheduler runtime dependency is currently available.

### Checklist and evidence coverage

The O1 checklist covers approval bypass, route-bound authorization, optimistic concurrency, audit, Organization outbox policies, migration, Redis, worker retry/DLQ, and CI evidence. Add or attach evidence for items not explicit in the command table:

- Platform-super-admin transitional boundary and proof tenant role flows cannot grant `SUPER_ADMIN`.
- Lifecycle/database direct-bypass risk and approved mitigation/limitation.
- Legacy Organization configuration-column compatibility/deprecation decision.
- Worker external idempotency and processed-status/audit atomicity limitation.
- API response DTO/Swagger contract verification.
- Compose start/health, reset, rollback, worker health/metrics, and manual concurrency outputs.

The evidence template lacks explicit command rows for Compose, reset, rollback, health endpoints, and `pnpm verify`. Attach those logs under Database, Redis, Worker, and API sections; do not leave them implied.

## Execution order

| Phase | Action | Expected duration | Evidence |
| --- | --- | ---: | --- |
| 0. Safety | Confirm host, Docker context, test URLs, clean state, and no production credentials. | 5–10 min | Redacted environment, Docker context, operator sign-off. |
| 1. Bootstrap | Run `bash scripts/bootstrap.sh`. | 5–20 min | Install output; Node/pnpm/Prisma versions; Compose config result. |
| 2. Stack | Start test Compose and wait for PostgreSQL, Redis, Mailpit, MinIO, API health. | 5–25 min | `docker compose ps`, health statuses, image digests. |
| 3. Database | Run `bash scripts/reset-test-db.sh`. | 1–5 min | Redacted URL, reset/seed logs, migration history. |
| 4. Worker | Start/wait for Worker; query `/health/live`, `/health/ready`, `/metrics`. | 1–3 min | HTTP status/body without sensitive values; worker logs. |
| 5. Automated gate | Run `bash scripts/verify-o1.sh` or remaining `pnpm verify`. | 5–30 min | Exit codes and full logs for every Prisma/pnpm command. |
| 6. Manual integration | Run approval, authorization mismatch, stale-version, concurrency, audit, outbox/DLQ, Redis failure-mode, Swagger checks. | 20–45 min | HTTP, SQL/Redis output, worker metrics. |
| 7. Rollback | Perform approved disposable DB rollback procedure. | 10–20 min | Before/after migration history and schema evidence. |
| 8. Cleanup | Export evidence; stop only test Compose; complete sign-off. | 10–15 min | Evidence template, artifact paths, cleanup output. |

**Estimated total:** 60–170 minutes, excluding dependency/image download and remediation time.

## Failure handling

- **Install failure:** stop; record package manager, DNS/cache, lockfile, and exit code. Do not substitute unlocked installation.
- **Compose failure:** preserve `docker compose logs` and `ps` before cleanup. Never switch to production compose or persistent volumes.
- **Database doubt:** stop before reset. Inspect URL, port, database, Docker context, and active connections. Escalate rather than relying only on substring validation.
- **Migration/seed failure:** stop; capture migration history and PostgreSQL logs. Do not use `db push`, manual SQL, or reset outside disposable test infrastructure.
- **Worker failure:** capture readiness/metrics, worker logs, PostgreSQL/Redis health, and migration state.
- **Test/lint/typecheck/build failure:** capture exact command, exit code, revision, environment, and full log. Do not report only a later selective rerun.
- **Security/concurrency failure:** preserve test IDs, audit/outbox records, and metrics. Gate result is FAIL pending review.

## Evidence requirements

Capture command text, UTC start/end, exit code, redacted stdout/stderr artifact, operator, Git revision, Node/pnpm/Prisma versions, and Docker image versions. Never record secrets, tokens, passwords, encryption keys, plaintext verification values, or raw personal data.

Minimum artifacts:

- Compose `ps` and health output for all test services.
- Migration history, version/check/FK/index inspection, seed output, and rollback evidence.
- Redis ping, isolation, TTL, rate-limit, cache, and failure-mode evidence.
- Swagger; pending-owner denial; approved activation; route/header mismatch; stale-version conflicts.
- Concurrent traces proving one success/one conflict where required.
- Redacted Organization audit rows.
- Worker liveness/readiness/metrics, handler coverage, retry/DLQ/lease behavior, and external idempotency limitations.
- CI run/artifact links after proposed CI stages are enabled.

## Rollback precautions

- Use only `noagent4u-test` resources and a visibly test-only database URL.
- Automatic cleanup removes test volumes; export logs and evidence first.
- Never use `migrate reset`, `db push`, or test cleanup against VPS, development, staging, or production data.
- Use the approved database rollback method; image rollback alone does not roll back schema.

## Pass/fail criteria

### Pass eligibility

Gate O1 can be reconsidered only when every required command exits zero with evidence; no required PostgreSQL, Redis, worker, integration, concurrency, or rollback suite is skipped; approval/authorization/concurrency/audit/outbox assertions pass; worker health and handler policy checks pass; no unexpected dead letters or sensitive-log exposure occur; and outstanding architectural limitations are accepted by the appropriate ADR/gate authority.

### Automatic fail

Gate O1 is **FAIL** if any required command fails, evidence is missing, a non-disposable target is used, a required suite is skipped, a security/concurrency assertion fails, migration/rollback is unproven, or worker readiness reports failure/unexpected dead letters.
