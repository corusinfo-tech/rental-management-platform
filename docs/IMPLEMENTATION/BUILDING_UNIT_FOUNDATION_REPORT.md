# Building & Unit Foundation Report

## Database

Added additive migration `20260716110000_building_unit_management`, which appends `BLOCKED` to the existing `UnitStatus` enum. The existing data model already correctly separates operational unit state (`ACTIVE`, `BLOCKED`, `MAINTENANCE`, `ARCHIVED`) from occupancy (`VACANT`, `OCCUPIED`, `RESERVED`); no destructive redesign was made.

## Entities

- `Building`, `Floor`, and `Unit` CRUD extend the established Property hierarchy.
- `UnitOccupancy` records occupancy metadata and history only. It does not create tenants, leases, rental contracts, invoices, or payments.
- Existing `PropertyAmenity`, `PropertyImage`, and `PropertyDocument` metadata endpoints remain available from Sprint 1.

## Endpoints

All endpoints are organization-scoped and require an active `OWNER`, `ADMIN`, or `PROPERTY_MANAGER` membership.

- Building: create, update, soft delete, restore.
- Floor: create, update, soft delete, restore.
- Unit: create, update, soft delete, restore.
- `POST .../units/bulk-import` for transactional unit import per floor.
- `GET /organizations/{organizationId}/properties/{propertyId}/units` with search, status and occupancy filters, and pagination.
- `PATCH .../units/{unitId}/occupancy` for occupancy metadata history.

Every mutation creates an organization-scoped audit event in the same database transaction.

## Swagger

The existing `Properties` Swagger tag now includes documented Building, Floor, Unit, bulk-import, search, occupancy, soft-delete, and restore routes. DTO validation covers identifiers, limits, enum states, lengths, nested bulk-import items, and occupancy metadata.

## Files modified

- `prisma/schemas/property.prisma`
- `prisma/migrations/20260716110000_building_unit_management/migration.sql`
- `apps/api/src/property/dto/property.dto.ts`
- `apps/api/src/property/property.repository.ts`
- `apps/api/src/property/property.service.ts`
- `apps/api/src/property/property.controller.ts`

## Tests and verification

`pnpm prisma validate --schema prisma/schemas` was attempted but blocked before Prisma execution because pnpm could not resolve `registry.npmjs.org` (`ERR_PNPM_META_FETCH_FAIL` / `ENOTFOUND`). Typecheck, build, and tests were not run because dependencies could not be restored. No PostgreSQL or Redis runtime is available in this environment.

## Remaining work

- Execute Prisma format/validate/generate, migration deploy/rollback, typecheck, build, and tests once dependencies and disposable runtime services are available.
- Add focused repository, service, API, tenancy, pagination, bulk-import rollback, and occupancy-history integration tests.
- Add media binary upload/storage-provider integration; current image/document endpoints register validated storage metadata only.
- Add explicit amenity/image/document update/delete/restore operations if the product workflow requires independent media lifecycle management.
