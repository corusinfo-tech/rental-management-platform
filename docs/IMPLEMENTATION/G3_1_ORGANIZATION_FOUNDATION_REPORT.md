# G3.1 — Organization Domain Foundation Report

## Architecture

The Organization aggregate is implemented in `apps/api/src/organization/` with a dedicated controller, service, repository, DTOs, and module. The service owns transactions and lifecycle rules; the repository performs persistence only. Identity is reused strictly for the authenticated owner and active owner membership.

## Aggregate and business rules

The additive `Organization` model includes the requested legal/contact/locale fields plus `OrganizationStatus` and `OrganizationType`. Organizations are soft-deleted through `ARCHIVED` status and `deletedAt`.

Creation runs in one transaction:

1. verify the authenticated owner user exists;
2. create the organization in `PENDING` status;
3. create one active owner membership; and
4. write audit and `OrganizationCreated` outbox records.

A partial unique index enforces at most one live owner membership per organization. Archive writes `OrganizationArchived`; restore clears `deletedAt` and activates the aggregate. GST/PAN validation is intentionally deferred.

## API

All endpoints are protected by the existing access-token guard and require an active owner membership:

- `POST /api/v1/organizations`
- `GET /api/v1/organizations/{id}`
- `PATCH /api/v1/organizations/{id}`
- `DELETE /api/v1/organizations/{id}`

Swagger is tagged and uses bearer authentication metadata.

## Database

Migration `20260714100000_organization_domain_foundation` adds organization lifecycle/contact fields, enums, status/email indexes, and the one-owner partial unique index. It is additive.

## Verification and known risks

Dependency verification and tests could not run because pnpm had to reconstruct `node_modules` and registry DNS is unavailable. Docker is also unavailable, so no PostgreSQL migration/API/repository/audit/outbox integration test was run.

Pending tests include create/update/archive/restore, duplicate-owner constraint, owner authorization, repository persistence, API guard behavior, audit and outbox atomicity.

The current aggregate permits any active owner to update/archive; multi-owner/invitation/approval roles remain out of scope. The database index enforces at most one owner, while the application creation transaction supplies exactly one.

## Merge recommendation

**CONDITIONAL.** The foundation is implemented, but migration application and the required unit/integration/build verification must pass in a dependency-enabled environment before merge.
