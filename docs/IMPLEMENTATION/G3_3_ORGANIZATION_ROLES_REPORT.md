# G3.3 — Organization Roles & Permission Management

## Architecture

The existing Identity RBAC tables remain the single authorization model:

| Requested domain concept | Existing persistence model |
| --- | --- |
| OrganizationRole | `Role` scoped by `organizationId` |
| OrganizationPermission | `RolePermission` |
| OrganizationRoleAssignment | `MembershipRole` |

This avoids parallel role, permission, or assignment systems. `Role` now has a
description and default flag; `RolePermission` records its creation time; and
`MembershipRole` records who assigned a role and when. The pre-existing database
trigger continues to block a private role from being assigned outside its
organization.

## Permission model

Global system-role templates are seeded for `OWNER`, `ADMIN`,
`PROPERTY_MANAGER`, `FINANCE`, `MAINTENANCE`, `SUPPORT`, and `VIEWER`. Existing
application roles remain intact. `OWNER` and `ADMIN` receive the seeded platform
permissions; `organization.roles.manage` gates the role-management controller.

Only active owner memberships may pass the service business rule. Every G3.3 API
endpoint is guarded by the existing `AccessTokenGuard` and `PermissionGuard`,
then repeats the organization-owner check within its transaction. This keeps
authorization enforcement separate from persistence and prevents a permission in
another organization from authorizing a mutation in the route organization.

Custom roles are organization-owned, non-system `Role` records. Global system
templates can be assigned but cannot be modified or deleted through organization
APIs. A partial, case-insensitive unique index prevents duplicate active custom
role names per organization. A partial default-role index permits one active
custom default role per organization.

## Database

Migration: `20260714130000_organization_roles_and_permissions`

- Adds `Role.description` and `Role.isDefault`.
- Adds `RolePermission.createdAt`.
- Adds nullable legacy-compatible `MembershipRole.assignedByUserId` and
  `assignedAt`, plus a restrictive User foreign key and index.
- Adds the active-default and active-custom-role-name indexes.

The migration is additive. Existing assignments retain a null assigner only when
the historical actor is unknown; all new assignment writes include the owner
actor and timestamp.

## API

All endpoints are under `/api/v1` and documented in Swagger:

- `POST /organizations/{id}/roles`
- `GET /organizations/{id}/roles`
- `PATCH /organizations/{id}/roles/{roleId}`
- `DELETE /organizations/{id}/roles/{roleId}`
- `POST /organizations/{id}/roles/{roleId}/permissions`
- `POST /organizations/{id}/members/{membershipId}/roles`

The permission endpoint grants IDs idempotently. With `replace: true`, omitted
permissions are revoked and audited. The assignment endpoint accepts `remove:
true` to produce a controlled role removal without a second API route.

## Audit and outbox

Audit events:

- `organization.role.created`, `.updated`, `.deleted`
- `organization.permission.granted`, `.revoked`
- `organization.role.assigned`, `.removed`

Outbox events are transactionally written for `RoleCreated`, `PermissionGranted`,
and `RoleAssigned`; payloads contain identifiers only.

## Tests

Added focused unit tests for:

- Custom role creation plus `RoleCreated` outbox output.
- Permission grant/replacement/revocation behavior.
- Organization-scoped membership role assignment plus `RoleAssigned` output.

The intended remaining integration coverage is authorization denial, duplicate
role race handling, cross-organization assignment rejection, audit persistence,
and migration constraints.

## Known risks

- An authenticated caller must provide the existing organization context header
  expected by `PermissionGuard`; the transaction-bound owner check protects the
  route organization independently.
- Existing organizations created before the new `OWNER` seed/assignment path may
  need a controlled operational backfill of the OWNER role assignment before
  their owners can satisfy the permission guard.
- No local database or toolchain validation was possible: this workspace lacks
  Node/Prisma/TypeScript/ESLint binaries, and pnpm restoration is blocked by DNS
  `ENOTFOUND` errors for `registry.npmjs.org`.

## Merge recommendation

**CONDITIONAL** — the approved RBAC architecture is reused and the source,
migration, API, audit, outbox, and tests are present. Apply and validate against
a disposable PostgreSQL database, then run Prisma generation, lint, typecheck,
tests, and build before merging.
