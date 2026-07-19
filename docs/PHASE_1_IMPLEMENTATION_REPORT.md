# Phase 1 Authorization and Isolation Implementation Report

Implementation date: 2026-07-19
Scope: P0 authorization, data isolation, Settings repair, and automated negative authorization tests.
Architecture: the existing NestJS/Next.js/PostgreSQL modular monolith is retained.

## Approved execution checklist

- [x] Make platform administrators independent `PlatformPrincipal` records rather than organization members.
- [x] Centralize portfolio permissions and resource-scope checks for properties, units, leases, rent schedules, invoices, and payments.
- [x] Separate organization proprietor (`ORG_PROPRIETOR`) from managed-property asset owner (`ASSET_OWNER` plus `PropertyOwnership`).
- [x] Give property-manager and finance roles portfolio-scoped capabilities by default; require `portfolio.access.all` for organization-wide access.
- [x] Add explicit, auditable property-to-membership portfolio assignments and management endpoints.
- [x] Link tenants through an accepted invitation and verified `User/Person`-to-`LeaseParty` relation. Email/mobile values are not authorization keys.
- [x] Make Settings creation/backfill idempotent and make reads self-heal missing settings.
- [x] Add negative authorization tests for platform, organization-wide, scoped manager, finance, asset-owner, tenant, outsider, suspended, and cross-organization cases.
- [x] Retain the modular monolith and keep full owner/tenant portal UI work gated.
- [x] Make no Phase 1 GST/tax-rule or payment/WhatsApp/SMS/document-template provider implementation.

## Affected files

| Area                           | Primary files                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Data model and seed            | `prisma/schemas/{platform,identity,organization,property,rental,finance}.prisma`, `prisma/seed/identity.js`                                   |
| Additive migration             | `prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql`                                                               |
| Central authorization          | `apps/api/src/identity/authorization/{platform-principal.guard,portfolio-access.service,tenant-access.service}.ts`                            |
| Portfolio assignment           | `apps/api/src/organization/portfolio-assignment.*`, `apps/api/src/organization/dto/portfolio-assignment.dto.ts`                               |
| Organization identity/settings | approval, compliance, lifecycle, registration, invitation, role, and settings services/repositories/controllers under `apps/api/src`          |
| Scoped domain operations       | property, lease, billing, invoice, and payment services/repositories under `apps/api/src`                                                     |
| Automated evidence             | Phase 1 API tests under `apps/api/test`, endpoint-wiring test under `apps/web/test`, and `docs/audit-evidence/production-api-observations.md` |
| Audit corrections              | `docs/DASHBOARD_AND_FEATURE_AUDIT.md`, `docs/UI_UX_AND_THEME_AUDIT.md`, `docs/REFERENCE_RESEARCH.md`                                          |

## Additive migration sequence

1. Create `PlatformPrincipal` types/table and backfill active legacy global super-administrators. The legacy role path remains for application rollback compatibility.
2. Make legacy `Property.ownerUserId` nullable, add/backfill `createdByUserId`, and retain `PropertyOwnership` as the asset-ownership foundation.
3. Create `PropertyPortfolioAssignment` with organization/property/membership/user foreign keys and active-assignment indexes.
4. Add nullable verified tenant-link columns to `LeaseParty` and an optional invitation-to-lease-party link.
5. Add nullable `Payment.propertyId`; backfill only payments whose allocations resolve unambiguously to exactly one property.
6. Idempotently insert missing `OrganizationSettings` rows.
7. Upsert the Phase 1 permission catalog and new roles; grant organization-wide scope only to proprietor/admin roles and scoped capabilities to manager/finance/asset-owner roles.
8. Assign `ORG_PROPRIETOR` to proprietor memberships and convert only non-proprietor legacy `OWNER` assignments to `ASSET_OWNER`.

The migration contains no `DROP TABLE`, `DROP COLUMN`, or `DROP TYPE` operation.

## Rollback and forward-fix procedure

1. Before deployment, take a database snapshot and record the application image/commit and Prisma migration state.
2. Deploy the migration once, then deploy API, worker, and web from the same commit. Do not run destructive SQL to reverse the schema.
3. If the new application fails before it writes Phase 1-only data, roll the application image back while leaving additive tables/columns in place. The legacy platform role and property-owner column were retained.
4. If the new application has written properties with a null legacy `ownerUserId`, do not roll directly to a version that assumes that column is non-null. Forward-fix the application, or run a reviewed compatibility backfill based on an explicitly approved legacy-owner mapping before rolling the image back.
5. If a backfill is wrong, correct affected rows with an audited forward migration. Never drop `PlatformPrincipal`, verified tenant links, portfolio assignments, or payment scope while they may contain production writes.
6. Re-run the Settings insert safely if needed; its `ON CONFLICT (organizationId) DO NOTHING` behavior is tested.

## Acceptance and test matrix

| Principal/scenario            | Expected result                                                                                                                                                                         | Automated evidence                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Platform administrator        | Platform actions use an active independent principal; organization membership cannot substitute, and the retained legacy platform role contributes no organization-workspace permission | `platform-principal.guard.test.mjs`, `portfolio-access.service.test.mjs`               |
| Organization proprietor/admin | Organization-wide resource scope only with explicit `portfolio.access.all`                                                                                                              | `portfolio-access.service.test.mjs`                                                    |
| Property manager              | Assigned properties only by default; direct unassigned property/lease IDs denied                                                                                                        | `portfolio-access.service.test.mjs`                                                    |
| Finance user                  | Assigned invoice/payment scope; cannot infer property-management permission                                                                                                             | `portfolio-access.service.test.mjs`, `payment.service.test.mjs`                        |
| Asset owner                   | Scope is the union of explicit assignments and `PropertyOwnership`, without organization-wide access                                                                                    | `portfolio-access.service.test.mjs`                                                    |
| Portfolio grant               | Only organization-wide member managers can grant; cross-organization property IDs fail before writes                                                                                    | `portfolio-assignment.service.test.mjs`                                                |
| Tenant                        | Only verified Person-to-LeaseParty links resolve lease/invoice/payment/document scope; every payment allocation must remain in linked leases                                            | `tenant-access.service.test.mjs`, `organization-invitation.service.test.mjs`           |
| Outsider/suspended/cross-org  | Denied before resource lookup or assignment mutation                                                                                                                                    | `portfolio-access.service.test.mjs`, `portfolio-assignment.service.test.mjs`           |
| Settings                      | Missing settings are created on read and migration backfill is rerunnable                                                                                                               | `organization-settings.service.test.mjs`, `phase1-migration.test.mjs`                  |
| Production-page API claim     | Dashboard/management pages call authenticated real organization/property/lease/invoice/payment/settings endpoints and reject failed envelopes                                           | `management-api-wiring.test.mjs`, `docs/audit-evidence/production-api-observations.md` |
| Migration safety              | Additive contract, backfills, verified FK, and targeted legacy-role conversion                                                                                                          | `phase1-migration.test.mjs`; Prisma schema validation/generation                       |

## Verification results

- Prisma schema validation: passed.
- Prisma Client generation: passed with Prisma 6.19.3.
- API TypeScript and automated tests: passed (96 tests, including tenant payment-allocation isolation and both directions of the platform/organization principal boundary).
- Web TypeScript and automated tests: passed (8 tests).
- Full monorepo test pipeline: passed for all 12 packages; the pre-existing database integration suite reported one explicit skip because `IDENTITY_TEST_DATABASE_URL` is not configured.
- Monorepo production build: passed for all 12 packages; Next.js compiled and generated all routes.
- Database execution: not performed locally because this checkout has no disposable integration-database configuration. Production must run the migration through the release profile after snapshotting and then execute the smoke checks below.
- Repository-wide Prettier check: not clean; it reports 230 pre-existing/unrelated formatting targets across current, legacy, documentation, configuration, and lock files. Phase 1 lint and `git diff --check` pass, and this implementation does not bulk-reformat unrelated files.

## Production smoke checks

1. Confirm `docker compose --env-file .env.production -f docker-compose.production.yml --profile release config --services` includes `migrate`.
2. Build exact service names: `docker compose --env-file .env.production -f docker-compose.production.yml build migrate api worker web`.
3. Run migration: `docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate`.
4. Start/update runtime services: `docker compose --env-file .env.production -f docker-compose.production.yml up -d api worker web`.
5. Verify API and web health, Settings for an existing organization, a platform-admin approval read, a scoped-manager property list, a scoped-finance invoice/payment list, and negative cross-organization requests.
