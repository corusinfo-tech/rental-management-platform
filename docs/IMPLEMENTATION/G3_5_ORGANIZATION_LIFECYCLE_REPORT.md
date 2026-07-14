# G3.5 — Organization Lifecycle

## State machine

```text
PENDING   -> ACTIVE
ACTIVE    -> SUSPENDED | ARCHIVED
SUSPENDED -> ACTIVE
ARCHIVED  -> ACTIVE
```

Every other transition raises a conflict before persistence. The repository uses
an expected-current-status update, so concurrent transitions that observe stale
state fail rather than overriding the newer lifecycle state.

## Business rules

- `ARCHIVED` sets `deletedAt` and never physically deletes organization data.
- Restore clears `deletedAt` and moves only `ARCHIVED` organizations to ACTIVE.
- Suspended and otherwise inactive organizations cannot create invitations.
- Property creation and invoice issuance are not present in this repository; the
same `Organization.status === ACTIVE` boundary must be applied when those
modules are introduced.
- Approval is not implemented.

## API

All routes are protected by the existing access-token authorization boundary and
documented in Swagger:

- `POST /api/v1/organizations/{id}/activate`
- `POST /api/v1/organizations/{id}/suspend`
- `POST /api/v1/organizations/{id}/archive`
- `POST /api/v1/organizations/{id}/restore`

The older DELETE archive endpoint delegates to the same lifecycle service and
therefore cannot bypass transition validation.

## Authorization

The lifecycle service resolves authorization from the existing membership/role
RBAC model within its transaction. It permits either an active owner membership
in the target organization or a user holding the seeded global `SUPER_ADMIN`
system role. No new user flag, parallel authorization table, or token claim was
introduced.

## Audit and outbox

Allowed transitions write the corresponding transaction-bound audit and outbox
event:

| Target state | Audit | Outbox |
| --- | --- | --- |
| ACTIVE | `organization.activated` | `OrganizationActivated` |
| SUSPENDED | `organization.suspended` | `OrganizationSuspended` |
| ARCHIVED | `organization.archived` | `OrganizationArchived` |
| ACTIVE after archive | `organization.restored` | `OrganizationRestored` |

Restore uses its explicit `OrganizationRestored` lifecycle event while still
returning the organization to ACTIVE.

## Tests

Added focused unit tests for:

- Allowed PENDING-to-ACTIVE persistence, audit, and outbox behavior.
- Invalid PENDING-to-SUSPENDED rejection before persistence.
- Authorized global SUPER_ADMIN restoration.

Integration coverage still required: all transition combinations, owner denial,
concurrent transitions, archive soft-delete persistence, suspended invitation
rejection, and real audit/outbox transactions.

## Known risks

- The current identity schema has no organization-independent platform-role
  assignment. `SUPER_ADMIN` is therefore represented by an existing membership
  assignment to the global system role. A future approved platform-identity
  design may replace that representation.
- Node, Prisma, TypeScript, and ESLint binaries are unavailable in this
  workspace. pnpm restoration cannot resolve `registry.npmjs.org` (`ENOTFOUND`),
  so Prisma validation, migrations, lint, tests, and build were not run.

## Merge recommendation

**CONDITIONAL** — state machine, authorization reuse, audit/outbox, Swagger,
and focused tests are implemented. Validate migrations and run the complete
toolchain against disposable PostgreSQL before merging.
