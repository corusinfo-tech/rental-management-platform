# G3.7 — Organization Audit & Compliance

## Architecture

`OrganizationCompliance` is a separate, one-to-one informational governance
aggregate. It does not alter `OrganizationApproval` and it does not invoke,
change, or bypass `OrganizationLifecycleService`.

Every new organization receives a default compliance record within its creation
transaction, including public landlord registration. The additive migration
backfills one default record for every existing organization.

## Compliance model

The aggregate contains compliance status, provider-agnostic KYC and GST status
strings, review dates, risk level, and administrative notes. KYC/GST values are
informational only: no external provider, OCR, document upload, API validation,
or automatic lifecycle action is implemented.

Defaults are `UNDER_REVIEW`, KYC `PENDING`, GST `PENDING`, and LOW risk.

## Business rules

- A unique organization foreign key guarantees one record per organization.
- Compliance changes are informational and never suspend, archive, activate, or
  otherwise mutate the Organization lifecycle.
- Review scheduling is represented by `nextReviewAt`; it does not create a
  background job in this story.

## Database

Migration: `20260714160000_organization_compliance`

- Adds `ComplianceStatus`, `RiskLevel`, and `OrganizationCompliance`.
- Adds a restrictive one-to-one Organization foreign key and unique index.
- Adds status/review and risk/update lookup indexes.
- Backfills existing organizations without changing lifecycle or approval data.

## API

Swagger documents the platform-admin endpoints:

- `GET /api/v1/admin/organizations/{id}/compliance`
- `PATCH /api/v1/admin/organizations/{id}/compliance`

The response is an explicit settings/compliance allow-list and does not expose
identity credentials, tokens, sessions, or approval mutation controls.

## Authorization

Endpoints reuse the access-token guard. The service enforces the existing global
`SUPER_ADMIN` membership-role inside the transaction. Organization owners,
organization admins, and custom-role holders cannot read or update compliance.

## Audit and outbox

Every update writes `organization.compliance.updated` and
`OrganizationComplianceUpdated`. A changed risk level additionally writes
`organization.risk.changed` and `OrganizationRiskChanged`. A changed scheduled
review date writes `organization.review.scheduled`. Outbox payloads contain only
IDs and changed-field metadata.

## Tests

Added focused unit tests for separate-record retrieval and a combined compliance,
risk, and review-schedule update. Required integration coverage remains: default
creation, super-admin denial, unique constraint, risk-change persistence,
audit/outbox persistence, and transaction rollback.

## Known risks

- Platform super admin is represented by the existing global system role attached
  to a membership; a separate platform-assignment model would require an approved
  Identity architecture change.
- Node, Prisma, TypeScript, and ESLint binaries are unavailable in this
  workspace. pnpm restoration remains blocked by DNS `ENOTFOUND` errors for
  `registry.npmjs.org`; Prisma validation, migrations, lint, tests, and build were
  not run.

## Merge recommendation

**CONDITIONAL** — the separate aggregate, one-to-one migration, authorization,
audit, outbox, Swagger, and focused tests are present. Validate on disposable
PostgreSQL and run Prisma generation, lint, typecheck, tests, and build before
merging.
