# Phase 1 Authorization and Isolation Validation Report

Evidence date: 2026-07-19 (Asia/Kolkata)

Scope: Phase 1 validation only. Phase 2 was not started and production was not changed.

Architecture: the NestJS/Next.js/PostgreSQL modular monolith is retained.
Acceptance state: all critical validation gates described below pass with zero critical skips. This report records a candidate for product-owner acceptance; it does not itself deploy or declare product acceptance.

## Repository evidence

- Branch: `agent/fix-production-migrations`
- Validation baseline commit: `0d33d91211a3deec8c6305ec02dd1642ce57ae85`
- Final tested implementation commit: `d6ebf44ffdc265d3d0b668cad093326750adc33f`
- Upstream at validation start: `origin/agent/fix-production-migrations`
- Git state at validation start: clean
- Git status immediately after the tested implementation commit: clean
- Push result: `d6ebf44ffdc265d3d0b668cad093326750adc33f` pushed successfully to `origin/agent/fix-production-migrations`
- Phase 1 migration: `20260719120000_phase1_authorization_isolation/migration.sql`
- Final migration SHA-256: `1312bb9c48f00a77846af9ba8ca9e133278850d0313c799398b57e16acfdca9c`
- Migration count: 24; `prisma migrate status` reports `Database schema is up to date!`

The exact Phase 1 commit file list is:

```text
apps/api/src/finance/invoice.repository.ts
apps/api/src/finance/invoice.service.ts
apps/api/src/finance/payment.repository.ts
apps/api/src/finance/payment.service.ts
apps/api/src/identity/authorization/current-membership.resolver.ts
apps/api/src/identity/authorization/platform-principal.guard.ts
apps/api/src/identity/authorization/portfolio-access.service.ts
apps/api/src/identity/authorization/tenant-access.service.ts
apps/api/src/identity/identity.module.ts
apps/api/src/identity/registration/public-registration.service.ts
apps/api/src/identity/repositories/identity.repository.ts
apps/api/src/organization/approval.controller.ts
apps/api/src/organization/approval.repository.ts
apps/api/src/organization/compliance.controller.ts
apps/api/src/organization/compliance.repository.ts
apps/api/src/organization/dto/invitation.dto.ts
apps/api/src/organization/dto/portfolio-assignment.dto.ts
apps/api/src/organization/invitation.controller.ts
apps/api/src/organization/invitation.repository.ts
apps/api/src/organization/invitation.service.ts
apps/api/src/organization/lifecycle.repository.ts
apps/api/src/organization/organization.module.ts
apps/api/src/organization/organization.service.ts
apps/api/src/organization/portfolio-assignment.controller.ts
apps/api/src/organization/portfolio-assignment.repository.ts
apps/api/src/organization/portfolio-assignment.service.ts
apps/api/src/organization/role.controller.ts
apps/api/src/organization/role.repository.ts
apps/api/src/organization/role.service.ts
apps/api/src/organization/settings.controller.ts
apps/api/src/organization/settings.repository.ts
apps/api/src/organization/settings.service.ts
apps/api/src/property/property.repository.ts
apps/api/src/property/property.service.ts
apps/api/src/rental/billing.repository.ts
apps/api/src/rental/billing.service.ts
apps/api/src/rental/lease.repository.ts
apps/api/src/rental/lease.service.ts
apps/api/test/billing.service.test.mjs
apps/api/test/invoice.service.test.mjs
apps/api/test/lease.service.test.mjs
apps/api/test/organization-invitation.service.test.mjs
apps/api/test/organization-settings.service.test.mjs
apps/api/test/payment.service.test.mjs
apps/api/test/phase1-migration.test.mjs
apps/api/test/platform-principal.guard.test.mjs
apps/api/test/portfolio-access.service.test.mjs
apps/api/test/portfolio-assignment.service.test.mjs
apps/api/test/public-registration.service.test.mjs
apps/api/test/tenant-access.service.test.mjs
apps/web/test/management-api-wiring.test.mjs
docs/DASHBOARD_AND_FEATURE_AUDIT.md
docs/DASHBOARD_IMPLEMENTATION_PLAN.md
docs/INTEGRATION_AND_TEMPLATE_AUDIT.md
docs/PHASE_1_IMPLEMENTATION_REPORT.md
docs/REFERENCE_RESEARCH.md
docs/UI_UX_AND_THEME_AUDIT.md
docs/audit-evidence/authenticated-dashboard-mobile-390.png
docs/audit-evidence/authenticated-dashboard.png
docs/audit-evidence/authenticated-invoices.png
docs/audit-evidence/authenticated-leases.png
docs/audit-evidence/authenticated-payments.png
docs/audit-evidence/authenticated-properties-mobile-390.png
docs/audit-evidence/authenticated-properties.png
docs/audit-evidence/authenticated-settings.png
docs/audit-evidence/production-api-observations.md
prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql
prisma/schemas/finance.prisma
prisma/schemas/identity.prisma
prisma/schemas/organization.prisma
prisma/schemas/platform.prisma
prisma/schemas/property.prisma
prisma/schemas/rental.prisma
prisma/seed/identity.js
```

The final tested implementation commit contains this exact validation delta:

```text
M  apps/api/src/identity/authorization/current-membership.resolver.ts
M  apps/api/src/identity/authorization/portfolio-access.service.ts
M  apps/api/src/organization/invitation.repository.ts
M  apps/api/src/organization/role.repository.ts
M  apps/api/src/organization/settings.repository.ts
M  docs/PHASE_1_IMPLEMENTATION_REPORT.md
M  packages/database/package.json
M  prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql
M  prisma/schemas/finance.prisma
M  prisma/schemas/identity.prisma
M  prisma/schemas/property.prisma
M  prisma/seed/identity.js
M  tests/identity-database.test.mjs
A  apps/api/test/phase1-database.integration.test.mjs
A  docs/PHASE_1_PRODUCTION_RUNBOOK.md
A  scripts/validate-phase1-upgrade.sh
A  tests/fixtures/phase1-http-fixtures.mjs
A  tests/fixtures/phase1-preupgrade.sql
A  tests/fixtures/phase1-upgrade-assertions.sql
A  tests/phase1-database.test.mjs
A  tests/phase1-http.test.mjs
```

## Final release attestation

- Tested source SHA: `d6ebf44ffdc265d3d0b668cad093326750adc33f`
- Migration SHA-256: `1312bb9c48f00a77846af9ba8ca9e133278850d0313c799398b57e16acfdca9c`
- Tested-tree Git status after commit: clean
- Remote publication: successful to `origin/agent/fix-production-migrations`
- Typecheck: 12/12 package tasks passed
- Lint: 12/12 package tasks passed
- Build: 12/12 package tasks passed
- Forced monorepo tests: 12/12 package tasks passed, with 102/102 API and 21/21 database tests, zero failures and zero critical skips
- HTTP role matrix: 10/10 passed, zero skipped
- Representative pre-Phase-1 upgrade: passed all SQL assertions
- Diff whitespace validation: `git diff --check` passed

Commit `d6ebf44ffdc265d3d0b668cad093326750adc33f` is exactly the source tree on which the final commands ran. This attestation is a documentation-only follow-up because a Git commit cannot embed its own SHA without changing that SHA; it does not alter application source, schema, migration, fixtures, scripts, or tests.

## Execution checklist

- [x] Keep platform principals separate from organization administrators.
- [x] Keep organization proprietors separate from managed-property asset owners.
- [x] Require explicit portfolio assignments for managers and finance users; organization-wide access requires `portfolio.access.all`.
- [x] Require accepted invitations and verified Person-to-LeaseParty links for tenants; email/mobile matching is never an authorization key.
- [x] Add database constraints and guards for organization-consistent assignments, payments, invitations, and tenant links.
- [x] Make concurrent Settings initialization create exactly one row.
- [x] Ensure legacy `SUPER_ADMIN`, `OWNER`, and `LANDLORD` roles do not bypass the new organization policy.
- [x] Validate a clean migration and a representative pre-Phase-1 upgrade.
- [x] Run database-backed, API integration, negative authorization, and live HTTP role-matrix tests.
- [x] Retain real-endpoint evidence in `apps/web/test/management-api-wiring.test.mjs` and `docs/audit-evidence/production-api-observations.md`.
- [x] Keep GST/tax rules and payment, WhatsApp, SMS, and document-template providers out of Phase 1.
- [x] Do not deploy and do not begin Phase 2.

## Disposable integration environment

PostgreSQL 16.14 was provisioned under a generated validation-only temporary directory and bound to loopback on a non-production port. The isolated databases were `phase1_clean`, `phase1_upgrade`, `phase1_api`, and `phase1_http`. Redis 8.8.0 ran on loopback without persistence, and the HTTP fixture API used a loopback-only validation port. The values were created for this local run, were never production values, and are represented by placeholders below so a copied command cannot be mistaken for a production command.

The fixture password is a deterministic test-only value, all fixture addresses use the reserved `.test` domain, and all fixture people and identifiers are synthetic. The release-content scan found no production credential, provider token, private key, real personal data, or user-specific absolute filesystem path.

## Clean database and schema evidence

Every one of the 24 migrations applied to an empty `phase1_clean` database. Final checks reported:

- Prisma migration status: up to date, no pending migrations.
- Prisma schema validation: valid.
- Prisma Client generation: passed with Prisma 6.19.3.
- Database integration: 21 passed, 0 failed, 0 skipped.
- Required tables verified: `PlatformPrincipal`, `PropertyPortfolioAssignment`, plus altered Settings, LeaseParty, invitation, Property, and Payment structures.
- Composite organization foreign keys verified: `PropertyPortfolioAssignment_propertyId_organizationId_fkey`, `PropertyPortfolioAssignment_membershipId_organizationId_fkey`, and `Payment_propertyId_organizationId_fkey`.
- Unique indexes verified: `OrganizationMembership_id_organizationId_key`, `Property_id_organizationId_key`, `OrganizationSettings_organizationId_key`, `PlatformPrincipal_userId_key`, `LeaseParty_linkVerificationId_key`, and `PropertyPortfolioAssignment_membershipId_propertyId_key`.
- Scoped indexes verified: `PropertyPortfolioAssignment_organizationId_membershipId_revoked`, `PropertyPortfolioAssignment_propertyId_revokedAt_idx`, and `Payment_organizationId_propertyId_paidAt_idx`.
- Database guards verified: `PropertyPortfolioAssignment_assigner_organization_guard`, `OrganizationInvitation_lease_party_organization_guard`, and `LeaseParty_verified_identity_link_guard`.

The database-backed tests deliberately attempt cross-organization property, membership, actor, payment, invitation, and tenant-link writes and confirm PostgreSQL rejects them.

## Representative pre-Phase-1 upgrade

`tests/fixtures/phase1-preupgrade.sql` was loaded after all migrations preceding `20260719120000_phase1_authorization_isolation`; the Phase 1 migration was then applied and `tests/fixtures/phase1-upgrade-assertions.sql` executed.

| Measure                                      | Before |                             After |
| -------------------------------------------- | -----: | --------------------------------: |
| Organizations                                |      2 |                                 2 |
| Organization Settings                        |      0 |                                 2 |
| Platform principals                          |      0 |                                 1 |
| Properties                                   |      3 |                                 3 |
| Payments                                     |      3 |                                 3 |
| Payment allocations                          |      4 |                                 4 |
| Payments with unambiguous property           |      0 |                                 1 |
| Ambiguous/unmatched payments left null       |      3 |                                 2 |
| Lease parties                                |      1 |                                 1 |
| Automatically linked lease parties           |      0 |                                 0 |
| Automatically inferred portfolio assignments |      0 |                                 0 |
| Membership-role rows                         |      3 | role-conversion assertions passed |

Backfill outcomes:

- Settings backfill created exactly one row for each of two organizations.
- PlatformPrincipal backfill created exactly one active principal from the representative legacy platform administrator.
- The proprietor retained compatibility `OWNER` and gained `ORG_PROPRIETOR`; the non-proprietor legacy owner became `ASSET_OWNER`; the legacy platform membership retained `SUPER_ADMIN` only as a permissionless compatibility role.
- All three properties received `createdByUserId`; no portfolio assignments were inferred.
- No tenant identity link was inferred from email or mobile.
- `payment-single` resolved to `property-a1`.
- `payment-multi` remained null because its allocations span properties.
- `payment-cross-org` remained null because the payment organization and allocated property organization differ.
- Ambiguous/unmatched count after backfill: 2; cross-organization auto-links: 0.

## Authorization and API evidence

The forced, non-cached monorepo run passed all 12 package tasks. Critical test totals were:

| Suite                           | Passed | Failed | Skipped |
| ------------------------------- | -----: | -----: | ------: |
| Database integration            |     21 |      0 |       0 |
| API unit + database integration |    102 |      0 |       0 |
| Web endpoint wiring             |      8 |      0 |       0 |
| Worker                          |      6 |      0 |       0 |
| Live HTTP fixture matrix        |     10 |      0 |       0 |
| Arithmetic total                |    147 |      0 |       0 |

The 147 count is the arithmetic sum of independent test cases from the five listed runners: database and API integration are separate files and databases, web and worker are separate packages, and the HTTP matrix is a separate process against the running API. Their acceptance themes intentionally overlap, so 147 is not a count of unique authorization requirements. The SQL upgrade assertions are also independent but are reported as an upgrade validation rather than included as Node test cases.

Database-backed acceptance coverage proves:

- Assignment property, membership, assigning user, and organization consistency.
- Cross-organization assignments are rejected by composite foreign keys and actor guards.
- Asset owners see only owned or explicitly assigned properties.
- Managers and finance users see assigned portfolios only; finance capability does not imply property-management capability.
- Accepted invitations cannot create cross-organization tenant links.
- Suspended memberships and suspended platform principals lose access; revoked assignments disappear from scope.
- Tenant payment access validates every allocation.
- Multi-property or otherwise ambiguous historical payments default to denial.
- Eight concurrent Settings reads produce exactly one Settings row.
- Legacy `SUPER_ADMIN` and `OWNER`, even when manually associated with new permissions in the test database, cannot enter the new organization authorization path.

The deterministic HTTP run started the real Nest API against `phase1_http`, authenticated through the normal session endpoint, and exercised platform administrator, organization proprietor, organization admin, scoped property manager, scoped finance user, asset owner, tenant, outsider, suspended user, and a second organization. All 10 scenarios passed, including direct-resource and cross-organization denials.

## Exact validation commands

Commands were run from the repository root. The bundled Node/pnpm paths and local PostgreSQL/Redis binary paths were prepended to `PATH`. This sanitized command transcript uses explicit validation placeholders instead of a workstation username, generated temporary path, or reusable database URL.

```bash
export PHASE1_PG_BASE_URL='postgresql://<validation-user>@127.0.0.1:<validation-port>'
export PHASE1_REDIS_URL='redis://127.0.0.1:<validation-port>/15'
export PHASE1_HTTP_URL='http://127.0.0.1:<validation-port>'

pnpm typecheck
pnpm lint
pnpm build

DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_clean" pnpm exec prisma migrate status --schema prisma/schemas
DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_clean" pnpm exec prisma validate --schema prisma/schemas
DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_clean" pnpm exec prisma generate --schema prisma/schemas

IDENTITY_TEST_DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_clean" pnpm --filter @noagent4u/database test
PHASE1_UPGRADE_DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_upgrade" PHASE1_PSQL_BIN="$(command -v psql)" scripts/validate-phase1-upgrade.sh
PHASE1_API_TEST_DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_api" DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_api" pnpm --filter @noagent4u/api test

PHASE1_TEST_API_URL="${PHASE1_HTTP_URL}" node --test tests/phase1-http.test.mjs

IDENTITY_TEST_DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_clean" \
PHASE1_API_TEST_DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_api" \
DATABASE_URL="${PHASE1_PG_BASE_URL}/phase1_api" \
REDIS_URL="${PHASE1_REDIS_URL}" \
pnpm exec turbo run test --force --env-mode=loose

git diff --check
git status --short
git diff-tree --no-commit-id --name-only -r 0d33d91211a3deec8c6305ec02dd1642ce57ae85
shasum -a 256 prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql
```

The `--force --env-mode=loose` flags are required for the aggregate evidence run: without them Turbo can replay a cache entry created when the database URL was absent and display the database-gated API suite as skipped even though a URL is present in the parent shell.

## Build, typecheck, lint, and remaining observations

- `pnpm typecheck`: 12/12 package tasks passed.
- `pnpm lint`: 12/12 package tasks passed.
- `pnpm build`: 12/12 package tasks passed; Next.js compiled and generated 16 routes.
- `git diff --check`: passed.
- Remaining critical failures: none.
- Remaining critical skips: none in the forced database-configured run.
- Non-critical observation: Next.js warns that multiple lockfiles exist above the application directory and infers a workspace root. It did not affect compilation or route generation.
- A repository-wide Prettier audit still reports broad pre-existing formatting debt; no unrelated bulk formatting was performed.

## Additive migration and recovery procedure

The Phase 1 migration creates the independent platform-principal and portfolio-assignment structures, adds verified tenant-link and payment-scope columns, backfills Settings/platform/property/payment data conservatively, adds composite organization constraints and validation triggers, creates the new permission/role catalog, and converts only the intended legacy role rows. It contains no `DROP TABLE`, `DROP COLUMN`, or `DROP TYPE` operation.

Before production, snapshot PostgreSQL and record the application image, commit, and migration status. Deploy migration, API, worker, and web from one immutable commit. If the application fails before Phase 1-only writes, roll back the application image while retaining the additive schema. If Phase 1-only writes have occurred, prefer a reviewed forward fix; do not remove new tables, columns, links, assignments, or payment scope. Correct any backfill with a new audited migration. Do not roll back to code that assumes legacy `Property.ownerUserId` is non-null unless an explicit compatibility backfill has been reviewed.

## Final diff summary

- **Schema and migration:** composite organization keys and foreign keys, assignment/payment constraints, conservative payment backfill, legacy-role conversion, and database guards for assignment actors and verified tenant links.
- **Authorization:** legacy `SUPER_ADMIN`, `OWNER`, and `LANDLORD` compatibility roles are excluded from organization-workspace permission resolution.
- **Organization/portfolio management:** property, membership, organization, and assigning-user consistency is enforced for portfolio assignments.
- **Tenant linkage:** invitations and verified Person-to-LeaseParty links must remain within one organization and require active membership.
- **Finance scope:** payment property scope uses a composite property/organization relation; ambiguous, multi-property, and cross-organization historical payments remain denied.
- **Settings repair:** concurrent first reads use idempotent `createMany(skipDuplicates)` and return the single organization Settings row.
- **Tests and fixtures:** clean-database, pre-Phase-1 upgrade, database-backed policy, deterministic HTTP principal matrix, and negative cross-organization fixtures and assertions.
- **Documentation:** final validation evidence and `docs/PHASE_1_PRODUCTION_RUNBOOK.md`; no Phase 2 or provider implementation.

## Production smoke commands — not executed

These are the exact proposed commands and expected outcomes. They were recorded only; this validation did not deploy.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml --profile release config --services
# Expected: postgres, redis, api, migrate, web, worker

docker compose --env-file .env.production -f docker-compose.production.yml build migrate api worker web
# Expected: all four named build targets succeed: migrate, api, worker, and web; do not type webA

docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate
# Expected: all 24 migrations applied or "No pending migrations to apply"

docker compose --env-file .env.production -f docker-compose.production.yml up -d api worker web
# Expected: the three runtime services are healthy

docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate pnpm exec prisma migrate status --schema prisma/schemas
# Expected: "Database schema is up to date!"
```

After deployment approval, authenticated smoke requests should expect: platform admin can access a platform endpoint but is denied an organization workspace without membership; proprietor/admin can see the whole organization; manager and finance see assigned portfolios only; asset owner sees owned/assigned properties only; tenant sees only verified linked lease resources; outsider, suspended user, and cross-organization direct IDs receive denial. Settings reads should return one organization row even under concurrent first access. No production command or HTTP smoke request was executed during this validation.

The operator-ready deployment sequence, evidence capture, smoke matrix, logs, and rollback/forward-fix conditions are in `docs/PHASE_1_PRODUCTION_RUNBOOK.md`.
