# Property Foundation Report

## Database changes

Added additive migration `20260716100000_property_management_foundation` and replaced the Property Prisma placeholder with organization-scoped models, restrictive foreign keys, uniqueness constraints, check constraints, and query indexes.

## Entities and relations

- `Property`: one organization, one primary owner user, many buildings, documents, images, amenities, and ownership records.
- `PropertyAddress`: one-to-one with Property.
- `Building` → `Floor` → `Unit`: the required hierarchy with organization isolation inherited from Property.
- `UnitOccupancy`: occupancy metadata only; no rental lifecycle is implemented.
- `PropertyDocument` and `PropertyImage`: metadata and storage-key registration only; no storage-provider implementation is introduced.
- `PropertyOwnership`: supports a primary creator ownership record and future shared ownership.

## API and Swagger endpoints

All endpoints require a valid bearer session and an active organization membership with an `OWNER`, `ADMIN`, or `PROPERTY_MANAGER` role.

- `POST /api/v1/organizations/{organizationId}/properties`
- `GET /api/v1/organizations/{organizationId}/properties`
- `GET /api/v1/organizations/{organizationId}/properties/{propertyId}`
- `PATCH /api/v1/organizations/{organizationId}/properties/{propertyId}`
- `DELETE /api/v1/organizations/{organizationId}/properties/{propertyId}`
- `POST /api/v1/organizations/{organizationId}/properties/{propertyId}/restore`
- `POST /api/v1/organizations/{organizationId}/properties/{propertyId}/amenities`
- `POST /api/v1/organizations/{organizationId}/properties/{propertyId}/images`
- `POST /api/v1/organizations/{organizationId}/properties/{propertyId}/documents`

The list endpoint supports `page`, `limit`, `search`, `status`, `sortBy`, and `sortOrder`.

## Files modified

- `prisma/schemas/property.prisma`
- `prisma/schemas/organization.prisma`
- `prisma/schemas/identity.prisma`
- `prisma/migrations/20260716100000_property_management_foundation/migration.sql`
- `apps/api/src/app.module.ts`
- `apps/api/src/property/property.module.ts`
- `apps/api/src/property/property.controller.ts`
- `apps/api/src/property/property.service.ts`
- `apps/api/src/property/property.repository.ts`
- `apps/api/src/property/dto/property.dto.ts`

## Audit and security

Create, update, archive, restore, amenity, image-metadata, and document-metadata mutations run in a transaction and create organization-scoped audit events. All Property queries include `organizationId`; cross-organization property IDs therefore resolve as not found. Destructive cascades are not used.

## Tests and verification

No verification command completed. pnpm cannot restore dependencies because this environment cannot resolve `registry.npmjs.org`; Prisma client generation, schema validation, migration execution, TypeScript compilation, and tests remain pending. No PostgreSQL or Redis container is available in this environment.

## Remaining work

- Web Property list, detail, create/edit, filtering, and upload interfaces are not implemented.
- Binary upload, object storage integration, virus scanning, media lifecycle, and signed URL delivery are intentionally not implemented; current endpoints only register trusted storage metadata.
- Separate CRUD endpoints for buildings, floors, units, and occupancy changes are not implemented; initial hierarchy is supported during Property creation.
- Add repository, service, controller, API, tenancy, pagination, and migration integration tests once disposable PostgreSQL/Redis and dependencies are available.
- Run Prisma format/validate/generate, migration deploy/rollback, lint, typecheck, test, and build before merge.
