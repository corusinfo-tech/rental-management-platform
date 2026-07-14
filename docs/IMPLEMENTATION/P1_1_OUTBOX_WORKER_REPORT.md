# P1.1 — Transactional Outbox Worker Report

## Result

**CONDITIONAL — worker foundation implemented; live delivery and database integration remain blocked.**

## Architecture

The new worker foundation is located in `apps/worker/src/outbox/`. `OutboxWorker` owns polling, atomic PostgreSQL row claiming, worker leases, retry scheduling, dead-letter transition, handler dispatch, completion state, and in-memory operational metrics. It is independent of provider implementations.

```text
OutboxEvent (PENDING) → atomic lease claim → registered handler → PROCESSED
                                             ↘ retry/backoff → PENDING
                                             ↘ exhausted → DEAD_LETTER
```

## Lease and idempotency model

- Claiming is a single `UPDATE … FROM (SELECT … FOR UPDATE SKIP LOCKED)` statement.
- It supports multiple workers and reclaims abandoned `PROCESSING` rows after `leaseExpiresAt`.
- Each worker can complete/fail only events leased by its own `leaseOwner`.
- Handlers receive the immutable outbox event ID and must use it as the provider idempotency key.
- Successful worker completion writes one outbox audit event after the guarded status transition.

## Retry and dead-letter model

- `attempts` increments during atomic claim.
- Failures use exponential delay: `retryBaseDelayMs × 2^(attempts - 1)`.
- After `maximumAttempts`, the event transitions to `DEAD_LETTER` and retains a bounded error message.
- The worker exposes processed, failed, retry, dead-letter, queue-latency, and processing-duration counters.

## Database changes

Migration `20260714090000_transactional_outbox_worker` is additive. It adds:

- `OutboxEventStatus.DEAD_LETTER`
- `availableAt`
- `leaseOwner`
- `leaseExpiresAt`
- `lastError`
- indexes for scheduled pending work and expired leases

## Handlers and delivery boundary

`VerificationRequestedOutboxHandler` is registered as the minimal delivery handler boundary. It delegates to `VerificationDeliveryPort`, whose future authorised implementation must load/decrypt the envelope, deliver with event-ID idempotency, and destroy the envelope only after provider success.

Provider, invoice, and webhook handlers remain explicit stubs as required. No SMTP, SMS, WhatsApp, invoice, or webhook provider is implemented.

## Configuration

`OutboxWorkerConfig` defines poll interval, lease timeout, maximum attempts, retry base delay, and batch size. It is constructor-injected so the worker entrypoint can obtain values through the approved configuration boundary when that entrypoint is introduced.

## Verification

- Prisma format/validate: passed.
- Prisma client generation: passed after approved local engine-cache access.
- `pnpm --filter @noagent4u/worker typecheck`: passed.
- The final full-workspace verification could not complete: pnpm recreated `node_modules` and attempted registry downloads, but network resolution was unavailable.
- Docker is unavailable, so no disposable PostgreSQL/Redis integration, migration application, concurrent-worker, lease, retry, envelope, or audit integration test was executed.

## Known risks

1. No concrete authorised `VerificationDeliveryPort` exists yet, so verification messages still cannot be delivered.
2. Claim/retry/DLQ correctness needs PostgreSQL 16 concurrent-worker tests.
3. Outbox audit creation is not yet in the same transaction as the processed status update; production implementation should make that pair atomic.
4. A persistent metrics exporter and worker process/bootstrap configuration are still needed.
5. Provider idempotency is a contract only until a concrete provider adapter is implemented.

## Recommendation

**CONDITIONAL.** Do not deploy the worker until disposable PostgreSQL integration proves atomic claiming, lease recovery, retry/DLQ behavior, handler idempotency, envelope destruction, and audit consistency.
