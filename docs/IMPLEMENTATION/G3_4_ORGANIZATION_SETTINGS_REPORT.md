# G3.4 — Organization Settings & Configuration

## Architecture

`OrganizationSettings` is a separate one-to-one aggregate. It is not embedded
in the Organization API model and is accessed through its own repository,
service, controller, DTO allow-list, audit records, and outbox events.

The older Organization `timezone`, `currency`, and `country` columns are
retained only for backwards-compatible migration history. New organization
creation writes configuration only to `OrganizationSettings`; the migration
backfills the separate record from those legacy values without deleting data.

## Database

Migration: `20260714140000_organization_settings`

- Creates `OrganizationSettings` with all requested locale, tax, invoice, brand,
  contact, and notification fields.
- Uses a unique `organizationId` and restrictive foreign key to create the
  one-to-one relationship.
- Adds the invoice-sequence lower-bound check and country lookup index.
- Backfills one record for each existing organization.

Organization creation now inserts its settings record in the same transaction as
the organization, owner membership, owner-role assignment, audit, and outbox.

## Business rules

- Exactly one settings record exists per organization through the unique key.
- Defaults are UTC, INR, DD/MM/YYYY, 24-hour time, English, India, GST disabled,
  `INV` prefix, and invoice sequence 1.
- Validation is deliberately soft: format/length checks protect storage and
  presentation, while GST verification and logo upload are deferred.
- Settings are never copied into new Organization configuration columns.

## API

All endpoints are Swagger documented under `/api/v1`:

- `GET /organizations/{id}/settings`
- `PATCH /organizations/{id}/settings`

Responses are explicit allow-lists and contain no token, session, or unrelated
identity fields.

## Authorization

The existing `AccessTokenGuard` and `PermissionGuard` require
`organization.settings.manage`. The settings service then performs the business
authorization check inside its transaction: only an active owner membership or
an active membership assigned the global system `ADMIN` role is allowed. This
prevents a permission in another organization context from authorizing a target
organization mutation.

## Audit and outbox

Every patch creates `organization.settings.updated` plus an
`OrganizationSettingsUpdated` outbox event. Brand-field changes additionally
create `organization.brand.updated` and `BrandUpdated`. Invoice/GST changes
create `organization.invoice_settings.updated`. Payloads contain IDs and changed
field names only.

## Tests

Added focused unit tests for authorized defaults/read output and for a combined
brand/invoice update’s audit/outbox behavior. Intended integration coverage
includes automatic creation defaults, owner/Admin denial, unique one-to-one
constraint, transaction rollback, and audit/outbox persistence.

## Known risks

- Existing Organization configuration columns should be retired only in a future
  explicitly approved destructive migration after all consumers use settings.
- Existing organization owners may need the controlled OWNER-role assignment
  backfill described in G3.3 before satisfying the permission guard.
- Node, Prisma, TypeScript, and ESLint binaries are absent in this workspace;
  pnpm dependency restoration is blocked by DNS `ENOTFOUND` failures for
  `registry.npmjs.org`. Prisma, migrations, lint, tests, and build were not run.

## Merge recommendation

**CONDITIONAL** — the separate aggregate, migration, authorization, audit,
outbox, Swagger, and focused tests are present. Validate on disposable
PostgreSQL and run Prisma generation, lint, typecheck, tests, and build before
merging.
