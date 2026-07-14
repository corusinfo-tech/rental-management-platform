# O1 Verification Evidence

**Status: PENDING — template only.** Do not mark an item passed without an
attached command result from the disposable environment.

## Execution context

| Field | Value |
| --- | --- |
| Date/time (UTC) | |
| Operator | |
| Git revision | |
| Node / pnpm | |
| PostgreSQL image/version | |
| Redis image/version | |
| Test database identifier (redacted) | |
| Redis database/namespace | |

## Command results

| Command | Exit code | Start/end time | Log artifact | Result |
| --- | ---: | --- | --- | --- |
| `pnpm install --frozen-lockfile` | | | | |
| `pnpm prisma format --schema prisma/schemas` | | | | |
| `pnpm prisma validate --schema prisma/schemas` | | | | |
| `pnpm prisma generate --schema prisma/schemas` | | | | |
| `pnpm prisma migrate deploy --schema prisma/schemas` | | | | |
| `pnpm prisma db seed --schema prisma/schemas` | | | | |
| `pnpm typecheck` | | | | |
| `pnpm lint` | | | | |
| `pnpm test` | | | | |
| `pnpm --filter @noagent4u/worker test` | | | | |
| `pnpm build` | | | | |

## Logs

- Installation:
- Prisma:
- PostgreSQL migration/seed/rollback:
- Redis:
- API/integration:
- Worker:
- Build:

## Screenshots

Attach or link only non-sensitive screenshots:

- Docker service health (`postgres`, `redis`):
- Swagger availability:
- CI job summary:

## Database evidence

- Migration history query/output:
- Version columns and positive checks:
- Organization audit columns, FK, and indexes:
- One-to-one and invitation uniqueness constraints:
- Transaction rollback and concurrency results:

## Redis evidence

- Health output:
- Isolated database/namespace confirmation:
- Rate-limit/cache/reuse/failure-mode test output:
- TTL cleanup confirmation:

## Worker evidence

- Registered Organization event policy list:
- Missing-policy startup failure test:
- Terminal-policy processing result:
- Lease/retry/dead-letter/concurrent-worker test output:

## API, authorization, and audit evidence

- Pending-owner activation denial:
- Approved activation transaction:
- Route/header mismatch denial:
- Stale-version conflict results:
- Audit-row query samples with sensitive values redacted:

## Build evidence

- Typecheck summary:
- Lint summary:
- Unit/integration/worker test counts:
- Build artifacts and exit code:

## Sign-off

| Role | Name | Date | Decision |
| --- | --- | --- | --- |
| QA | | | |
| DevOps | | | |
| Security | | | |
| Principal Architect | | | |
