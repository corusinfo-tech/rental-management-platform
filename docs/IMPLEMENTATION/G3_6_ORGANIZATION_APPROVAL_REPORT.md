# G3.6 — Organization Approval Workflow

## Architecture

`OrganizationApproval` is a separate one-to-one administrative-review aggregate.
It is not an Organization lifecycle state and does not add approval fields to the
Organization table. The approval service owns review status; the existing
`OrganizationLifecycleService` owns activation.

New landlord organizations receive a PENDING approval record in the same
transaction as their creation. This covers both the Organization API and public
landlord registration. Existing landlord organizations are backfilled by the
additive migration without changing their lifecycle status.

## Approval workflow

```text
Landlord organization -> Approval PENDING
PENDING --approve--> APPROVED + lifecycle PENDING -> ACTIVE
PENDING --reject--> REJECTED + organization remains PENDING
REJECTED --reopen--> PENDING + organization remains PENDING
```

Only a pending organization may be approved or rejected. Only a rejected,
still-pending organization may be reopened. Rejection requires a reason;
reopening accepts an optional review note.

## Database

Migration: `20260714150000_organization_approval`

- Creates `ApprovalStatus` and `OrganizationApproval`.
- Adds a unique restrictive one-to-one foreign key to Organization.
- Adds optional restrictive reviewer foreign key to User.
- Adds pending-review and reviewer lookup indexes.
- Backfills only LANDLORD organizations.

The migration is additive and performs no lifecycle-status mutation.

## Authorization

Every admin endpoint uses the existing access-token guard. The approval service
then checks the established global system `SUPER_ADMIN` membership-role through
the existing RBAC model inside its transaction. Organization owners and ordinary
organization administrators cannot review their own or other organizations.

## Lifecycle integration

Approval invokes `OrganizationLifecycleService.activate` using the approval
transaction. This retains lifecycle validation, authorization, audit, and outbox
behavior while making approval status, organization activation, and approval
events atomic.

## API

Swagger documents the versioned endpoints:

- `GET /api/v1/admin/organizations/pending`
- `POST /api/v1/admin/organizations/{id}/approve`
- `POST /api/v1/admin/organizations/{id}/reject`
- `POST /api/v1/admin/organizations/{id}/reopen`

## Audit and outbox

Audits: `organization.approval.requested`, `organization.approved`,
`organization.rejected`, and `organization.review.reopened`.

Outbox: `OrganizationApproved` and `OrganizationRejected`; approval also reuses
the lifecycle `OrganizationActivated` event when approval succeeds.

## Tests

Added focused unit tests for approval/lifecycle integration, rejection without
lifecycle activation, and rejected-review reopening. Required integration
coverage remains: one-to-one constraint, super-admin denial, pending list,
concurrent decisions, audit/outbox persistence, and transaction rollback.

## Known risks

- Platform super admin remains represented by a global system role attached to a
membership because the current identity architecture has no separate platform
assignment table.
- Node, Prisma, TypeScript, and ESLint binaries are unavailable locally, and
pnpm dependency restoration is blocked by `registry.npmjs.org` DNS `ENOTFOUND`.
Prisma validation, migration execution, lint, tests, and build were not run.

## Merge recommendation

**CONDITIONAL** — approval, lifecycle integration, authorization, audit, outbox,
Swagger, additive migration, and focused tests are present. Run the complete
toolchain and disposable PostgreSQL migration/integration suite before merging.
