# Gate O1 — Organization Platform Review

**Decision: FAIL**

The Organization Platform has a sound initial domain decomposition and several
good database safeguards, but it is not safe to proceed as production-ready.
Two material control failures exist: a landlord owner can bypass administrative
approval by activating a pending organization, and organization outbox events
have no runnable handlers. The required PostgreSQL, Redis, migration, build,
and end-to-end verification evidence is also absent.

## Scope and review basis

This was a static, read-only review of the complete repository, Organization
implementation reports, migrations, Identity authorization code, worker code,
and API contracts. No code was changed.

`AGENTS.md` and `docs/ENGINEERING_HANDBOOK/` are not present in the supplied
worktree. Consequently, this review cannot certify Handbook compliance; it
assesses the implemented behavior against the stated story contracts and the
repository's own implementation reports.

## Scores

| Area | Score | Assessment |
| --- | ---: | --- |
| Architecture | 58/100 | Aggregates and repositories are separated, but authorization and event boundaries are inconsistent. |
| Security | 38/100 | Approval can be bypassed and platform-super-admin authority is coupled to a tenant membership. |
| Database | 64/100 | Restrictive FKs, one-to-one uniqueness, and useful indexes exist; lifecycle invariants are application-only and unverified. |
| Performance | 52/100 | Several appropriate lookup indexes exist, but no query-plan, concurrency, worker, or cache evidence is available. |
| Production readiness | 24/100 | The outbox is not operational for organization events and required verification has not run. |

## Safe components

- The aggregate is separated into `Organization`, `OrganizationSettings`,
  `OrganizationApproval`, and `OrganizationCompliance`; the latter three use
  unique organization IDs and restrictive foreign keys.
- Organization memberships, role assignments, invitations, and related
  references use restrictive foreign keys. The existing membership-role
  organization trigger is a positive defense against cross-organization private
  role assignment.
- Invitation creation, acceptance, decline, and revocation are transaction
  scoped and reuse the generic Verification Engine rather than adding a second
  token store.
- Lifecycle writes use conditional `updateMany` on the expected current state,
  preventing a simple lost-update transition race.
- The outbox claim query uses PostgreSQL `FOR UPDATE SKIP LOCKED`, which is a
  suitable starting mechanism for multi-worker row claiming.

## Critical findings

### O1-C01 — Pending landlord organizations can self-activate and bypass approval

**Evidence:** `apps/api/src/organization/lifecycle.controller.ts:11-12`
exposes `POST /organizations/:id/activate` to every authenticated caller.
`apps/api/src/organization/lifecycle.service.ts:15,21-24,46-49` permits
`PENDING -> ACTIVE` and authorizes any active organization owner. In contrast,
`apps/api/src/organization/approval.service.ts:18-27` intends approval by a
platform super administrator to be the operation that activates a pending
organization.

**Impact:** A landlord owner can activate their own pending organization before
an administrative review, defeating the approval workflow and any onboarding or
compliance controls built on it.

**Recommendation:** Make activation authorization state- and
organization-type-aware. A landlord with a pending approval must be activatable
only by the approval service after an atomic approved-state transition. Keep
owner-controlled restoration/suspension decisions only where explicitly
authorized. Add a regression API and database-concurrency test.

### O1-C02 — Organization outbox events have no operational delivery path

**Evidence:** Organization services emit event types such as `OrganizationCreated`,
`InvitationCreated`, `RoleAssigned`, and `OrganizationComplianceUpdated` (for
example `apps/api/src/organization/organization.service.ts:11`,
`apps/api/src/organization/invitation.service.ts:43,80`, and
`apps/api/src/organization/role.service.ts:91`). The worker only implements a
handler for `VerificationCreated` in
`apps/worker/src/outbox/handlers.ts:6-15`. `OutboxWorker.process` throws on an
unregistered event at `apps/worker/src/outbox/outbox-worker.ts:25-38`, causing
retries followed by `DEAD_LETTER`. No worker bootstrap or registration for the
organization event types exists.

**Impact:** The transactional outbox records are persisted but organization
events cannot be processed. This makes downstream audit, notification,
integration, and reliability guarantees false in operation and creates a
dead-letter backlog.

**Recommendation:** Before relying on organization outbox publication, provide
a bootstrapped worker with explicitly registered, idempotent handlers (or an
approved no-op terminal handler for intentionally local-only events). Add
PostgreSQL tests for each registered organization event and DLQ alerting for
unexpected types.

## High findings

### O1-H01 — Platform-super-admin authority depends on an arbitrary organization membership

**Evidence:** `apps/api/src/organization/lifecycle.repository.ts:12`,
`approval.repository.ts`, and `compliance.repository.ts:11` identify a platform
super administrator by locating an active `OrganizationMembership` with the
global `SUPER_ADMIN` role. The G3.6 and G3.7 reports explicitly acknowledge the
absence of a dedicated platform-assignment model.

**Impact:** Platform administrative power is coupled to tenant membership
lifecycle. Removing, suspending, or incorrectly scoping that membership can
disable platform administration; assigning the global role through a tenant
workflow can grant platform power. This weakens the platform/tenant boundary.

**Recommendation:** Obtain an approved Identity ADR for a platform principal or
platform-role-assignment boundary, then migrate authorization checks to it.
Until then, tightly restrict global-role assignment and add tests proving a
tenant owner cannot create or assign `SUPER_ADMIN`.

### O1-H02 — Worker delivery is not exactly-once across lease expiry

**Evidence:** `apps/worker/src/outbox/outbox-worker.ts:18-22` reclaims a
`PROCESSING` row once its lease expires. A first worker may continue executing
the external handler after the lease expires, while a second worker invokes the
same handler. The only safeguard is a comment requiring handlers to implement
provider idempotency (`apps/worker/src/outbox/outbox-worker.ts:7`), not a
persisted delivery or completion protocol. The P1.1 report also records that
outbox status and audit creation are not atomic.

**Impact:** An external notification or future webhook may be sent twice, and
the audit trail can disagree with outbox state after a process interruption.

**Recommendation:** Define and test a durable idempotency/completion protocol
for every external handler, renew or bound leases while processing, and atomically
write completion state and audit outcome. Treat provider idempotency as a
required enforced interface contract, not documentation.

### O1-H03 — Release-gate verification and CI coverage are insufficient

**Evidence:** Every G3 implementation report identifies missing disposable
PostgreSQL validation; G3.6 specifically states that Prisma validation,
migration execution, lint, tests, and build were not run. `.github/workflows/ci.yml`
only installs, lints, tests, and builds; it does not run Prisma format/validate/
generate, typecheck, migration deployment/rollback, seed, Docker compose, or
database/Redis integration suites. The focused organization tests import built
`dist` code and mock repositories (for example
`apps/api/test/organization-lifecycle.service.test.mjs:3-13`).

**Impact:** Migration defects, PostgreSQL constraint behavior, authorization
queries, transaction rollback, concurrent workflows, and runtime compilation
can reach merge or deployment without detection.

**Recommendation:** Restore the locked toolchain and add CI services for
disposable PostgreSQL 16 and Redis. Gate merge on Prisma format/validate/generate,
clean migration plus rollback, seed, explicit typecheck, API integration tests,
concurrency tests, and worker tests. Do not treat any prior skipped suite as a
pass.

## Medium findings

### O1-M01 — Permission context is supplied by an unbound request header

**Evidence:** `apps/api/src/identity/authorization/organization.resolver.ts:8-18`
uses `x-organization-id`; `CurrentMembershipResolver` resolves permissions from
that header at `current-membership.resolver.ts:19-37`. The role and settings
controllers protect routes whose target organization is `:id`, but neither
controller compares the header value to that route parameter
(`role.controller.ts:10-25`, `settings.controller.ts:10-17`).

**Impact:** Service-level owner/admin checks currently prevent a direct target
organization escalation, but requests can be authorized in one organization and
operate on another until a second, inconsistent check runs. This is brittle,
confusing to clients, and likely to become a cross-tenant vulnerability as new
endpoints are added.

**Recommendation:** Resolve organization context from the route parameter for
organization-scoped routes, or require and verify equality before permission
evaluation. Make this a reusable guard and add mismatch-denial tests.

### O1-M02 — Organization configuration remains duplicated in the aggregate

**Evidence:** `prisma/schemas/organization.prisma:55-57` retains `timezone`,
`currency`, and `country` on `Organization`, while
`OrganizationSettings` owns the same configuration at lines 109-117. The
settings migration backfills values but intentionally leaves the original
columns (`20260714140000_organization_settings/migration.sql:32-36`).

**Impact:** Two sources of truth can diverge, causing tenant-specific behavior
to depend on which model a future feature reads.

**Recommendation:** Publish an approved compatibility/deprecation plan,
declare the settings record authoritative now, migrate all reads/writes to it,
then remove legacy columns only in a separately approved destructive migration.

### O1-M03 — Organization audit actor attribution is inconsistent

**Evidence:** `OrganizationRepository.audit` writes the initiating user to
`subjectUserId` rather than `actorUserId`
(`apps/api/src/organization/organization.repository.ts:20`), whereas lifecycle,
invitation, settings, approval, compliance, and role repositories write an
`actorUserId`.

**Impact:** Organization creation and updates cannot be reliably attributed to
the acting principal. Compliance investigations and event correlation will be
inconsistent.

**Recommendation:** Standardize audit semantics across aggregates: actor is the
initiator, subject is the affected user only when applicable, and include a
stable organization/aggregate reference. Add an audit-schema contract test.

### O1-M04 — Lifecycle and approval invariants are not database-enforced

**Evidence:** The allowed transitions are implemented only in
`OrganizationLifecycleService.validateTransition`
(`apps/api/src/organization/lifecycle.service.ts:20-26`). The approval table has
no constraint tying approved/rejected states to organization state
(`20260714150000_organization_approval/migration.sql:3-19`). Any future direct
Prisma write, script, or administrative SQL can create contradictory states.

**Impact:** Application bypasses can leave an organization ACTIVE with a PENDING
or REJECTED approval, or make other invalid lifecycle combinations persistent.

**Recommendation:** Centralize all writes behind the lifecycle/approval service
immediately; then introduce an approved DB enforcement strategy (guarded stored
procedure, trigger, or equivalent) if direct database access is in scope. Add
constraint and bypass tests.

### O1-M05 — Transaction isolation and versioning are inadequate for settings and related updates

**Evidence:** Settings, compliance, invitation, lifecycle, and approval
repositories use `ReadCommitted` or Prisma defaults. Settings update is an
unconditional update by organization ID
(`apps/api/src/organization/settings.repository.ts:8-11`), with no expected
`updatedAt`/version predicate. Similar updates exist in compliance.

**Impact:** Concurrent administrators can silently overwrite each other's
configuration or compliance changes; audit events then record both changes even
though only the last write persists.

**Recommendation:** Adopt explicit optimistic concurrency for mutable settings
and compliance resources, return a conflict on stale versions, and integration-
test concurrent PATCH requests.

### O1-M06 — Event taxonomy and handler ownership are not centralized

**Evidence:** Organization services emit raw string event names, for example
`RoleCreated`, `PermissionGranted`, `InvitationAccepted`, and
`OrganizationComplianceUpdated`, while worker dispatch is a string-keyed map.
There is no shared event contract for organization producers and consumers.

**Impact:** Typos or contract drift are detected only after events dead-letter;
there is no compile-time discoverability of payload ownership or consumer
coverage.

**Recommendation:** Add a versioned shared event taxonomy and payload contracts,
with a startup assertion that all publishable event types have an approved
handler policy.

## Low findings

### O1-L01 — API response contracts are incomplete for several organization endpoints

**Evidence:** Core organization and lifecycle endpoints use bare
`@ApiCreatedResponse()`/`@ApiOkResponse()` without response DTO types
(`apps/api/src/organization/organization.controller.ts:12-19`,
`lifecycle.controller.ts:11-18`).

**Impact:** Swagger cannot provide a reliable client contract, and internal
Prisma fields can accidentally become public response fields after future edits.

**Recommendation:** Use explicit allow-listed response DTOs for every endpoint
and document error envelopes/statuses consistently.

### O1-L02 — The codebase is difficult to review and evolve

**Evidence:** Several controllers, repositories, and services compress entire
methods onto single lines, including the organization-creation transaction in
`apps/api/src/organization/organization.service.ts:11`.

**Impact:** Security-sensitive control flow, transaction boundaries, and future
reviews are unnecessarily error-prone.

**Recommendation:** Apply the repository formatter and maintain readable,
structured methods once the toolchain is restored; preserve behavior during that
maintenance change.

## Database, performance, and migration assessment

The migration series is additive and uses restrictive foreign keys for
Organization Settings, Approval, Compliance, Invitation, membership assignment,
and private roles. It includes useful indexes for lifecycle state, pending
invitations, review queues, compliance review queues, and membership role lookup.
The partial unique index for one pending invitation per organization/email and
the partial unique owner index are good foundations.

However, no fresh PostgreSQL 16 application, seed, upgrade, rollback, or query
plan has been executed. The settings, approval, and compliance backfills use
deterministic MD5-derived IDs and have no demonstrated production-data rehearsal.
The review therefore cannot certify migration safety or operational performance.

## Recommended remediation order

1. Block the approval-bypass lifecycle path and cover it with API, transaction,
   and concurrent-decision tests.
2. Establish a platform-level super-admin authority boundary through an approved
   Identity decision; prohibit tenant workflows from granting it.
3. Make the outbox operational: bootstrap the worker, provide handler policy for
   each organization event, and complete durable idempotency/lease/audit rules.
4. Bind authorization context to the target organization route and make policy
   enforcement uniform across every organization endpoint.
5. Restore the toolchain and implement a mandatory disposable PostgreSQL/Redis
   verification pipeline, including migration and concurrency coverage.
6. Resolve configuration duplication, audit semantics, typed event contracts,
   and optimistic-concurrency behavior.

## Technical debt and future improvements

- Define a formal platform-administrator identity model separate from tenant
  memberships.
- Introduce typed, versioned organization event contracts and observability for
  queue age, retries, and dead letters.
- Add archival/data-retention policy for organization audit and outbox records.
- Define a migration compatibility policy for legacy configuration columns and
  backfill rehearsal.
- Add pagination/filtering limits to member, role, approval, and compliance list
  endpoints before tenant sizes grow.

## Final gate decision

**FAIL.** Do not mark the Organization Platform production-ready or continue
under an assumption that its approval/outbox guarantees hold. Address both
critical findings and obtain successful, reproducible database and worker
verification before requesting a new gate review.
