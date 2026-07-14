# ADR-007: BullMQ + Redis

**Status:** Accepted direction; not operational yet

## Context

Invoice notifications and scheduled work must not block API requests.

## Decision

Use BullMQ backed by Redis for asynchronous delivery and future scheduled jobs.

## Consequences

Requires a worker deployment, idempotency, retry/DLQ policy, provider adapters and monitoring. Queue creation alone is not a delivery capability.

## Alternatives Considered

- Synchronous delivery.
- Database polling/cron only.
- Managed cloud queues.

## References

- `apps/api/src/invoices`; `docker-compose.production.yml`.
