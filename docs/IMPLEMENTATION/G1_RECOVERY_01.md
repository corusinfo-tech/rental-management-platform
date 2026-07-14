# G1 Recovery 01 — Canonical Implementation and Legacy Isolation

## Outcome

The repository contained two incompatible backend/database implementations. The Engineering Handbook-aligned implementation is retained in the active workspace. The conflicting tenant-based implementation was moved intact into `legacy/`; no files were deleted.

## Canonical implementation

The canonical implementation is:

- Prisma schema directory: `prisma/schemas/`
- Migration directory: `prisma/migrations/`
- Identity module: `apps/api/src/identity/`
- Active API foundation: `apps/api/src/core/`, `apps/api/src/health/`, `apps/api/src/app.module.ts`, and `apps/api/src/main.ts`
- Identity seed and database test: `prisma/seed/identity.js` and `tests/identity-database.test.mjs`

This is the only implementation that follows the Handbook’s intended model of a modular monolith with a `Person`/`User` distinction, organizations linked through memberships, membership-based role grants, role-permission joins, and a root-owned Prisma project.

It remains incomplete in the areas recorded by the G1 review (configuration validation, authorization guards, verification, transaction-safe refresh reuse detection, and live migration proof). “Canonical” here means the approved architectural direction, not production approval.

## Prisma schemas found

| Location | Classification | Notes |
| --- | --- | --- |
| `prisma/schemas/schema.prisma` | Canonical | Shared PostgreSQL datasource and Prisma client generator. |
| `prisma/schemas/identity.prisma` | Canonical | `Person`, `User`, `Role`, `Permission`, memberships, sessions, verifications, and identity audit events. |
| `prisma/schemas/organization.prisma` | Canonical | `Organization` persistence anchor for membership and private-role foreign keys. |
| `prisma/schemas/{communication,finance,maintenance,platform,property,rental}.prisma` | Canonical placeholders | Reserved domain boundaries; no duplicate models. |
| `legacy/apps/api/prisma/schema.prisma` | Legacy | Separate tenant/user/role/invoice schema incompatible with the root schema and generated client. |

## NestJS authentication implementations found

| Location | Classification | Reason |
| --- | --- | --- |
| `apps/api/src/identity/` | Canonical | Uses the root Identity schema and is the module imported by `AppModule`. |
| `legacy/apps/api/src/auth/` | Legacy | Uses tenant-scoped `User`, direct user role, and the legacy Prisma schema. It is not imported by the active application. |
| `legacy/apps/api/src/common/auth.decorator.ts`, `current-user.decorator.ts`, `roles.guard.ts` | Legacy | Implements direct tenant-role authorization for the legacy auth flow. |

## Database layers found

| Location | Classification | Reason |
| --- | --- | --- |
| `apps/api/src/identity/repositories/identity.repository.ts` | Canonical | Active Identity repository, generated from the root Prisma schema. |
| `prisma/seed/identity.js` | Canonical operational database layer | Seeds only canonical roles and permissions. |
| `tests/identity-database.test.mjs` | Canonical test database layer | Tests canonical migration constraints when an isolated database URL is configured. |
| `legacy/apps/api/src/common/prisma.service.ts` and `database.module.ts` | Legacy | Prisma provider for the tenant-based schema. |
| `legacy/apps/api/src/agreements/` and `legacy/apps/api/src/invoices/` | Legacy | Services query tenant-based legacy Prisma models and depend on the legacy Prisma provider/authentication. |

## User, Organization, and Role models found

| Concept | Canonical location | Legacy location | Classification decision |
| --- | --- | --- | --- |
| User | `prisma/schemas/identity.prisma` (`User`) | `legacy/apps/api/prisma/schema.prisma` (`User`) | Canonical User is an authentication account linked one-to-one with `Person`; legacy User combines person, tenant, direct role, and refresh hash. |
| Organization | `prisma/schemas/organization.prisma` (`Organization`) | None named `Organization`; `legacy/.../schema.prisma` uses `Tenant` as a different tenancy model | Canonical Organization is required by membership foreign keys. The legacy Tenant model is not equivalent to the Handbook organization/membership model. |
| Role | `prisma/schemas/identity.prisma` (`Role`) | `legacy/apps/api/prisma/schema.prisma` (`enum Role`) | Canonical Role is permission-capable and assigned through `MembershipRole`; legacy Role is directly assigned to a User. |

## Legacy files moved

| Previous active location | New preserved location |
| --- | --- |
| `apps/api/prisma/` | `legacy/apps/api/prisma/` |
| `apps/api/src/auth/` | `legacy/apps/api/src/auth/` |
| `apps/api/src/common/` | `legacy/apps/api/src/common/` |
| `apps/api/src/agreements/` | `legacy/apps/api/src/agreements/` |
| `apps/api/src/invoices/` | `legacy/apps/api/src/invoices/` |
| `apps/api/src/health.controller.ts` | `legacy/apps/api/src/health.controller.ts` |
| `apps/api/src/modules.md` | `legacy/apps/api/src/modules.md` |
| `packages/contracts/` | `legacy/packages/contracts/` |

`packages/contracts` was included because it used the old `@rentalos` namespace and contained legacy agreement/invoice API contracts. It was outside the declared pnpm workspace, had no active imports, and belongs to the same legacy implementation.

## Items intentionally not moved

- `docs/01_Discovery/**` and `docs/virtualmin-deployment.md` retain historical audit/deployment references. They are documentation evidence, not active executable implementations.
- `apps/api/Dockerfile` and `apps/web/Dockerfile` still contain stale `@rentalos` package filters. They are deployment defects recorded by G1, but they are not a second NestJS authentication or Prisma implementation. They require a separate, explicit Docker recovery task.
- `apps/mobile/` was not evaluated as a Prisma, NestJS authentication, or database implementation.

## Verification

`pnpm typecheck` passed after relocation. The active API source tree now contains only the bootstrap/core/health/Identity implementation and has no remaining legacy tenant Prisma imports.

## Follow-up boundary

This recovery isolates the architecture fork; it does not resolve the G1 security and production-readiness findings. Identity implementation should proceed only after the G1 gate blockers are addressed in their own scoped tasks.
