# O1 Hardening — Implementation Report

**Sprint status: IN PROGRESS — verification pending.**

This report records implementation work completed without external
infrastructure. It does not claim that Prisma, tests, lint, typecheck, build,
Docker, PostgreSQL, Redis, or CI have passed.

## Implemented

### Approval bypass — implemented, pending verification

- `OrganizationLifecycleService.activate()` now rejects `PENDING -> ACTIVE`.
- `activateAfterApproval()` is the internal lifecycle path used only by
  `OrganizationApprovalService` after a successful, version-guarded approval
  transition in the same transaction.
- The lifecycle route documentation now states that direct activation applies
  only to suspended/archived organizations.
- The focused lifecycle test was changed to assert that an owner cannot activate
  a pending organization.

Files: `apps/api/src/organization/lifecycle.service.ts`,
`lifecycle.controller.ts`, `approval.service.ts`,
`apps/api/test/organization-lifecycle.service.test.mjs`.

### Organization outbox policy — implemented, pending worker verification

- Added centralized API producer constants in
  `apps/api/src/organization/organization-events.ts`.
- Replaced Organization-module raw outbox event literals with those constants.
- Added worker-side Organization event policy coverage for every currently
  published Organization event.
- Added `TerminalNoopOutboxHandler`; it is an explicit terminal policy for
  local-only events rather than an unhandled event that immediately retries and
  dead-letters.
- `OutboxWorker` rejects duplicate registration and exposes
  `assertHandlerCoverage()`, which fails startup when a required event has no
  policy.
- `createOrganizationOutboxWorker()` composes all Organization terminal
  policies and invokes the coverage validation before polling.

Files: `apps/worker/src/outbox/{outbox-worker,handlers,types,organization-event-policy,organization-outbox-worker}.ts`.

### Platform administrator boundary — ADR created

- Created proposed ADR
  `docs/ADRs/ADR-O1-001-platform-principal-boundary.md`.
- It defines a future `PlatformPrincipal` / `PlatformRole` model independent of
  tenant memberships, without redesigning or modifying Identity in this sprint.

### Route-bound authorization context — implemented, pending integration verification

- Added `RouteOrganizationContextGuard`.
- It reads the organization ID from the `:id` route parameter, rejects invalid
  IDs, and rejects a conflicting `x-organization-id` header.
- `CurrentMembershipResolver` now uses the route-bound value first. The header
  remains only as a backwards-compatible fallback for routes that have no
  organization resource parameter.
- Role and settings endpoints invoke the route-context guard before
  `PermissionGuard`.

Files: `apps/api/src/identity/authorization/{route-organization-context.guard,organization.resolver}.ts`,
`identity.module.ts`, `organization/{role,settings}.controller.ts`.

### Audit consistency — implemented in Organization repositories, pending migration verification

- Added nullable `organizationId` and `aggregateId` columns and indexes to
  `IdentityAuditEvent` through an additive migration.
- Organization, lifecycle, approval, settings, compliance, role, and invitation
  audit repositories now write actor, subject where applicable, organization,
  aggregate, action, and metadata consistently.
- Corrected the Organization aggregate repository to write the initiating user
  as `actorUserId`, rather than as the subject.

Files: `prisma/schemas/identity.prisma`,
`prisma/schemas/organization.prisma`,
`prisma/migrations/20260714170000_organization_hardening/migration.sql`,
and Organization repositories.

### Optimistic concurrency — implemented, pending migration/API verification

- Added additive integer `version` columns (default `1`, positive check
  constraints) to settings, compliance, approval, and invitations.
- Added required `expectedVersion` DTO fields for mutation requests.
- Settings, compliance, approval, and invitation mutation repositories use
  guarded `updateMany` predicates and increment the version atomically.
- Services convert stale reads or losing concurrent writes into HTTP 409
  conflicts.
- Response DTOs expose versions for settings, compliance, approval, and
  invitations.

Files: Organization Prisma schemas/migration, DTOs, services, repositories,
controllers, and focused unit-test fixtures.

## Pending verification

| Area | Required evidence |
| --- | --- |
| Prisma schema | Format, validate, and generate against the composed schema. |
| Migration | Apply all migrations to a disposable empty PostgreSQL 16 database; verify `version`, audit columns, FKs, checks, and indexes. |
| Rollback rehearsal | Exercise the repository-approved rollback procedure against the disposable database. |
| Approval bypass | Owner receives denial for `PENDING -> ACTIVE`; super-admin approval atomically sets approval `APPROVED` and organization `ACTIVE`. |
| Authorization context | Route/header mismatch is denied; route ID alone drives permission lookup; no cross-organization access is possible. |
| Concurrency | Exactly one of two stale settings/compliance/approval/invitation mutations succeeds; the other receives 409. |
| Outbox | Startup coverage validation accepts all Organization producer events; unregistered required event fails startup; terminal events reach `PROCESSED` without dead-lettering. |
| Audit | Every Organization audit row has actor/subject semantics, `organizationId`, `aggregateId`, action, and metadata as appropriate. |
| Full workspace | Typecheck, lint, unit tests, integration tests, build, and CI workflow succeed. |

## Blocked by environment

- `AGENTS.md` and `docs/ENGINEERING_HANDBOOK/` are absent from this worktree, so
  Handbook-specific review cannot be certified.
- `pnpm install --frozen-lockfile` was attempted. Its lockfile validation ran,
  but package retrieval failed with DNS `ENOTFOUND` errors for
  `registry.npmjs.org`; dependencies were not restored.
- `node` is not available on the execution PATH, so test/build/Prisma commands
  cannot run without dependency restoration.
- `docker` is not installed in this execution environment. Disposable
  PostgreSQL/Redis services, migrations, rollback, worker integration, and
  concurrency tests therefore cannot run.
- No development, staging, or production infrastructure was accessed.

## Verification commands

Run from repository root after Node, pnpm dependencies, Docker Desktop, and
network/package-cache access are available:

```bash
pnpm install --frozen-lockfile
pnpm prisma format --schema prisma/schemas
pnpm prisma validate --schema prisma/schemas
pnpm prisma generate --schema prisma/schemas

docker compose -f docker-compose.yml up -d postgres redis
export IDENTITY_TEST_DATABASE_URL='postgresql://noagent4u:noagent4u_dev_password@127.0.0.1:5432/noagent4u_test?schema=public'
export REDIS_URL='redis://127.0.0.1:6379/15'

pnpm prisma migrate deploy --schema prisma/schemas
pnpm prisma db seed --schema prisma/schemas

pnpm typecheck
pnpm lint
pnpm test
pnpm build

docker compose -f docker-compose.yml down -v
```

The migration/rollback step must use the repository-approved disposable test
database mechanism and must not point at any persistent environment. If the
existing compose database name is reused, create a dedicated disposable test
database before `migrate deploy`.

## Expected outputs and evidence checklist

- `prisma format`, `validate`, and `generate` exit zero with the generated
  client reflecting audit context and version fields.
- A clean PostgreSQL migration history includes
  `20260714170000_organization_hardening`; all four version check constraints,
  audit indexes, and the restrictive audit-organization FK are present.
- Migration rollback produces the approved expected schema state and leaves no
  production data touched.
- Direct owner activation of a pending landlord yields a 403/409 according to
  the global exception mapping; approval succeeds only with a current approval
  version and platform authorization.
- Two requests using the same version yield one success and one 409 for each
  settings, compliance, approval, and invitation scenario.
- Worker construction fails with the missing event names if a producer event is
  omitted. With the supported composition, each Organization event has either a
  concrete handler or `TERMINAL_NOOP` policy and does not immediately enter
  `DEAD_LETTER`.
- Audit queries show non-null organization and aggregate values for Organization
  events, actor identity for initiated actions, and subject identity only when a
  user is affected.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` exit zero, with
  integration logs proving PostgreSQL and Redis coverage.

## Remaining risks

1. The `PlatformPrincipal` model is intentionally deferred under ADR-O1-001;
   current super-admin lookup remains tenant-membership based until that future
   approved release.
2. Organization event handling is currently explicit terminal no-op policy for
   local-only events, not a business delivery implementation. Any event that
   gains an external consumer must receive a concrete idempotent handler before
   use.
3. Worker process bootstrap, lease-renewal, durable external-provider
   idempotency, and atomic processed-status/audit completion remain broader
   platform-worker concerns requiring live integration tests.
4. Versioned invitation actions require the caller to retain the version
   returned at creation; the secure delivery payload and consumer UX must be
   verified before release.
5. No successful local or CI verification is available in this environment.

## Sprint conclusion

Implementation work described above is present, but **O1 Hardening is not
complete**. All verification remains **PENDING** until the stated commands and
evidence checklist are executed in an environment with the required toolchain
and disposable infrastructure.
