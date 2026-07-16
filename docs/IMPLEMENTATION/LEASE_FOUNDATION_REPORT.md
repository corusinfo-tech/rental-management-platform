# Lease Management Foundation Report

## Scope delivered

This sprint adds the Rental/Lease foundation only. It does not add invoices, payments, accounting, maintenance, notifications, communications, inspections, tenant identity management, or file-upload providers.

## Database

The additive migration is `20260716120000_lease_management_foundation`.

It creates these models:

- `Lease`: organization-scoped lease aggregate, assigned to one existing Unit.
- `LeaseTerms`: one-to-one commercial terms, including rent, security deposit, escalation, grace period, notice period, late fee, and currency.
- `LeaseParty`: tenant, co-tenant, and guarantor records.
- `LeaseDocument`: document metadata and object-storage key only; it does not store binary files.
- `LeaseRenewal`: immutable renewal history.

`LeaseStatus` supports `DRAFT`, `ACTIVE`, `NOTICE_TERMINATED`, `EXPIRED`, and `ARCHIVED`.

The migration adds restrictive foreign keys, organization/code uniqueness, per-lease document-key uniqueness, a partial unique index allowing only one active/termination-notice lease per unit, list/query indexes, and database check constraints for lease dates, renewal dates, non-negative terms, and non-negative document sizes. All relations use `ON DELETE RESTRICT`, preserving lease and audit history.

The existing `Organization` and `Unit` models receive only reverse relations. No Property, Building, or Unit hierarchy was redesigned.

## Backend implementation

The new `RentalModule` consists of a persistence-only `LeaseRepository`, `LeaseService`, versioned `LeaseController`, DTOs, and focused service tests. It is registered in `AppModule`.

Authorization follows the existing Property foundation: an active organization membership with `OWNER`, `ADMIN`, or `PROPERTY_MANAGER` role is required. Unit assignment is verified through the existing Unit → Floor → Building → Property hierarchy and the target organization. Consequently a unit from another organization cannot be assigned to a lease.

Mutating lease operations run in a Prisma transaction and write an `IdentityAuditEvent`:

- `lease.created`
- `lease.updated`
- `lease.party.added`
- `lease.document.added`
- `lease.renewed`
- `lease.termination.noticed`
- `lease.archived`
- `lease.restored`

The service prevents activating a lease when another active or termination-notice lease already exists for the same unit. Lease removal is soft deletion; restoration returns the lease to `DRAFT` so it is never silently reactivated.

## HTTP endpoints and Swagger

All endpoints are under `/api/v1/organizations/{organizationId}/leases`, protected by the established bearer-token and route-organization guards, and described with Swagger decorators.

- `POST /` — create a draft lease
- `GET /` — list leases with status, unit, and code filters plus pagination
- `GET /{leaseId}` — get lease details
- `PATCH /{leaseId}` — update status or terms
- `POST /{leaseId}/parties` — add party
- `POST /{leaseId}/documents` — add document metadata
- `POST /{leaseId}/renew` — extend term and create renewal history
- `POST /{leaseId}/terminate` — record termination notice
- `DELETE /{leaseId}` — soft delete
- `POST /{leaseId}/restore` — restore as draft

## Files modified or added

- `prisma/schemas/rental.prisma`
- `prisma/schemas/organization.prisma`
- `prisma/schemas/property.prisma`
- `prisma/migrations/20260716120000_lease_management_foundation/migration.sql`
- `apps/api/src/app.module.ts`
- `apps/api/tsconfig.json`
- `apps/api/src/rental/dto/lease.dto.ts`
- `apps/api/src/rental/lease.repository.ts`
- `apps/api/src/rental/lease.service.ts`
- `apps/api/src/rental/lease.controller.ts`
- `apps/api/src/rental/rental.module.ts`
- `apps/api/test/lease.service.test.mjs`

## Tests added

Focused unit coverage was added for lease creation and normalization, invalid date rejection, duplicate active-unit protection, and soft-delete auditing.

Integration/API tests are pending a runnable local dependency and PostgreSQL environment. They should cover migration application, cross-organization unit assignment rejection, role authorization, unique-code race handling, soft-delete/restore persistence, and renewal/termination transactions.

## Verification status

Not verified. `pnpm prisma validate --schema prisma/schemas` was attempted on 2026-07-16, but pnpm could not restore workspace packages because DNS could not resolve `registry.npmjs.org` (`ENOTFOUND`). Prisma did not execute. Typecheck, build, and tests were not run after that failed prerequisite.

Run these commands once Node.js, pnpm dependencies, and PostgreSQL are available:

```bash
pnpm install --frozen-lockfile
pnpm prisma format --schema prisma/schemas
pnpm prisma validate --schema prisma/schemas
pnpm prisma generate --schema prisma/schemas
pnpm migrate
pnpm --filter @noagent4u/api typecheck
pnpm --filter @noagent4u/api build
pnpm --filter @noagent4u/api test
```

## Remaining work

- Apply and validate the migration against an empty disposable PostgreSQL database.
- Add PostgreSQL integration tests and HTTP controller tests.
- Implement later-sprint invoice, payment, accounting, notification, communication, inspection, and maintenance behavior separately.
- Add a file-storage provider only in the future document-upload scope; this sprint deliberately accepts storage metadata only.
