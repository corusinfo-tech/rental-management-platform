# O1 Verification Checklist

**Status: PENDING.** Complete every item with evidence before requesting a new
Gate O1 review. Use only disposable local or CI PostgreSQL and Redis instances.

## Preconditions

- [ ] Node version satisfies `package.json` engines and pnpm is 11.7.0.
- [ ] `pnpm install --frozen-lockfile` completes without lockfile changes.
- [ ] Docker Desktop is running; PostgreSQL 16 and Redis 7 are healthy.
- [ ] `IDENTITY_TEST_DATABASE_URL` identifies an empty disposable database.
- [ ] `REDIS_URL` identifies an isolated disposable Redis database/namespace.
- [ ] No development, staging, or production URL is present in the shell.

## Prisma and PostgreSQL

- [ ] Prisma format succeeds for `prisma/schemas`.
- [ ] Prisma validate succeeds for the composed schema.
- [ ] Prisma client generation succeeds.
- [ ] All migrations apply to an empty PostgreSQL 16 database.
- [ ] Seed runs and creates only intended standard roles/permissions.
- [ ] `20260714170000_organization_hardening` creates all four positive
  `version` checks, organization audit fields/indexes, and restrictive FK.
- [ ] Existing one-to-one constraints, role/membership safeguards, and invitation
  uniqueness remain present.
- [ ] Repository-approved rollback rehearsal completes and is recorded.

## Redis

- [ ] Redis health check is healthy.
- [ ] Authentication/verification rate limiting works against the isolated URL.
- [ ] Redis failure-mode behavior is proven according to the approved policy.
- [ ] Session/cache and refresh-reuse behavior remains isolated between tests.
- [ ] No test leaves keys outside its dedicated test database/namespace.

## API and authorization

- [ ] Swagger starts and exposes Organization endpoints with version DTOs.
- [ ] An owner cannot directly activate a `PENDING` organization.
- [ ] A platform administrator approves with a current version and atomically
  transitions approval and lifecycle state.
- [ ] A stale approval version returns HTTP 409.
- [ ] Route `:id` resolves organization authorization context without a header.
- [ ] Matching route/header IDs are accepted; mismatched IDs are rejected.
- [ ] Role/settings permission checks cannot operate across organizations.

## Concurrency

- [ ] Two concurrent settings updates with the same version yield exactly one
  success and one conflict.
- [ ] The same result is proven for compliance, approval, invitation accept,
  invitation decline, and invitation revoke.
- [ ] Concurrent approval cannot bypass the lifecycle rule.
- [ ] Concurrent invitation handling creates at most one active membership and
  exactly one corresponding outbox event.

## Audit and outbox

- [ ] Organization audit rows consistently include actor, subject where
  applicable, organization ID, aggregate ID, action, and metadata.
- [ ] Audit foreign-key and index evidence is captured from PostgreSQL.
- [ ] Every Organization producer event is covered by a concrete or approved
  terminal worker policy at worker startup.
- [ ] Missing event policy fails startup before polling begins.
- [ ] A terminal event reaches `PROCESSED`, not immediate retry/dead letter.
- [ ] Worker lease, retry, duplicate claim, and dead-letter behavior is tested.

## Toolchain and CI

- [ ] `pnpm typecheck` succeeds.
- [ ] `pnpm lint` succeeds.
- [ ] Unit and integration tests succeed with no required database suite skipped.
- [ ] Worker tests succeed.
- [ ] `pnpm build` succeeds.
- [ ] Proposed CI stages run in a clean environment with PostgreSQL and Redis.
- [ ] Evidence is entered in `O1_VERIFICATION_EVIDENCE.md`.
