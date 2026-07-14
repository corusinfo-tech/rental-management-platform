# E2.1 — Runtime Worker & Production Deployment Report

**Status: Runtime platform implemented; not deployed and not verified in this
environment.**

No business modules, notification providers, or scheduler implementation were
added. The worker executes only existing explicit outbox handler policies.

## Runtime architecture

```text
Worker process
  ├─ Runtime configuration validation
  ├─ Manual dependency-injection container (WorkerRuntime)
  │   ├─ PrismaClient → PostgreSQL startup/readiness/queue queries
  │   ├─ ioredis → Redis startup/readiness checks
  │   └─ Organization outbox worker → polling and in-memory metrics
  ├─ Native HTTP health server (:3011)
  └─ SIGINT/SIGTERM graceful shutdown
```

`apps/worker/src/main.ts` loads configuration, constructs the runtime container,
installs signal handlers, starts dependency probes and polling, and shuts down
the health server, Redis, and Prisma in order. `WorkerRuntime` accepts injected
dependencies for isolated startup/health/shutdown tests while constructing real
Prisma and Redis clients in production.

## Worker lifecycle

1. Validate `DATABASE_URL`, `REDIS_URL`, worker health host/port, and outbox
   polling/retry settings before process startup.
2. Connect/query PostgreSQL and connect/ping Redis; any failure terminates
   startup with a non-zero exit.
3. Start the health server, mark the loop running, perform an initial poll, then
   poll at `OUTBOX_POLL_INTERVAL_MS` without overlapping polls.
4. Record poll timestamps and bounded errors; continue polling after an
   individual poll failure.
5. On `SIGINT` or `SIGTERM`, stop new polls, close the HTTP listener, quit
   Redis, disconnect Prisma, and exit.

## Health model

| Endpoint | Purpose | Success condition |
| --- | --- | --- |
| `GET /health/live` | Liveness | Process loop has started. |
| `GET /health/ready` | Readiness | PostgreSQL probe, Redis probe, and worker loop are all healthy. Includes queue snapshot. |
| `GET /metrics` | Basic runtime metrics | Returns in-memory worker counters and current queue snapshot. |

Readiness includes database and Redis probe latency, pending queue count, queue
lag from the oldest pending event, dead-letter count, worker ID, polling state,
and last poll timestamps/error. Metrics include worker started, processed,
failed, retried, dead-letter, queue-latency, and processing-duration counters.

## Docker and compose

- `apps/worker/Dockerfile` is now a runtime Node 22 image: frozen install,
  Prisma generation, worker compile, runtime-only copy, port 3011, and a
  `/health/ready` Docker health check.
- `docker-compose.test.yml` now runs the worker after the test database reset
  and supplies a worker health check on an isolated port.
- `docker-compose.production.yml` now includes a worker service, dependency
  ordering on healthy PostgreSQL/Redis, worker health check, and an API health
  check. Its PostgreSQL default names were aligned from `rentalos` to
  `noagent4u`.
- Production migrations remain a separately documented release step. Do not run
  reset commands in production compose.

For container-to-container production operation, `.env.production` must use
`postgres` and `redis` hostnames in its connection URLs—not `localhost`.

## Startup configuration

Required:

- `DATABASE_URL` with PostgreSQL protocol.
- `REDIS_URL` with Redis protocol.

Optional, validated positive integers:

- `WORKER_HEALTH_PORT` (default `3011`)
- `OUTBOX_POLL_INTERVAL_MS` (default `1000`)
- `OUTBOX_LEASE_TIMEOUT_MS` (default `30000`)
- `OUTBOX_MAX_ATTEMPTS` (default `8`)
- `OUTBOX_RETRY_BASE_DELAY_MS` (default `1000`)
- `OUTBOX_BATCH_SIZE` (default `20`)

All values are documented in `.env.example` without production secrets.

## Tests added

`apps/worker/test/runtime-config.test.mjs` covers:

- valid/default configuration;
- missing database configuration;
- invalid Redis URL;
- runtime startup, liveness/readiness endpoint, and graceful shutdown using
  injected dependencies;
- startup failure when PostgreSQL is unavailable;
- startup failure when Redis is unavailable.

The tests have not been run. Database-backed worker polling, lease recovery,
dead-letter, and concurrent-worker tests remain mandatory integration coverage.

## Monitoring and recovery

- Scrape or poll `/metrics` and `/health/ready` through private infrastructure;
  do not expose worker health publicly without an access policy.
- Alert on readiness failures, non-null `worker_last_poll_error`, increasing
  queue lag, retries, and dead-letter count.
- For recovery, inspect `OutboxEvent` state and provider idempotency records,
  correct the dependency/configuration fault, then allow lease expiry/retry or
  execute an approved replay procedure. Do not edit event payloads or delete
  dead letters without audit/replay controls.
- Restarting the process is safe for database leases, but external delivery is
  only as idempotent as the registered handler/provider contract.

## Known risks

1. The repository has no local `AGENTS.md` or Engineering Handbook, so their
   runtime requirements could not be confirmed.
2. Dependencies, Prisma generation, compile, tests, Docker build, compose,
   PostgreSQL/Redis connectivity, and health endpoints were not executed here.
3. Notification delivery/provider wiring remains out of scope. Outbox event
   types without a registered handler still follow the existing retry/DLQ path;
   this is visible in dead-letter metrics rather than silently acknowledged.
4. Worker metrics are in-memory and reset on restart; no metrics exporter or
   persistent aggregation was added.
5. The API `/health` endpoint currently reports process health only, not a
   database/Redis dependency probe.
6. Scheduler remains intentionally absent because it has no defined runtime
   implementation.
7. Production deployment still needs a reviewed migration job/runbook, secret
   delivery, worker provider wiring, TLS/reverse proxy, backups, and monitoring
   configuration before any production-readiness claim.

## Required verification

```bash
pnpm install --frozen-lockfile
pnpm prisma generate --schema prisma/schemas
pnpm --filter @noagent4u/worker typecheck
pnpm --filter @noagent4u/worker test
docker compose -f docker-compose.test.yml up --build --wait postgres redis api
bash scripts/reset-test-db.sh
docker compose -f docker-compose.test.yml up -d --wait worker
curl -fsS http://127.0.0.1:13011/health/live
curl -fsS http://127.0.0.1:13011/health/ready
curl -fsS http://127.0.0.1:13011/metrics
docker compose -f docker-compose.test.yml down --volumes --remove-orphans
```

Do not use the reset or test-compose commands against development, staging, or
production infrastructure.
