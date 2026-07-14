# Gate G1 — Foundation Architecture Review

## Decision

**FAIL** — the repository has useful foundation work, but it is not yet a coherent or safe baseline for continued Identity implementation. The blocking concern is not feature incompleteness; it is the coexistence of two incompatible application/database architectures, combined with an unactionable production container path.

## Scores

| Dimension | Score | Assessment |
| --- | ---: | --- |
| Architecture | 42/100 | Intended modular-monolith structure exists, but active and legacy implementations conflict. |
| Security | 31/100 | Argon2 and hashed stored refresh tokens are present, but JWT configuration, RBAC enforcement, verification, rate limiting, and rotation safety are incomplete. |
| Maintainability | 36/100 | TypeScript and lint/build tooling work, but excluded source, duplicate patterns, placeholder packages, and stale documentation create high change risk. |
| Production readiness | 22/100 | Local Compose is useful; production Docker, migration verification, health semantics, secrets validation, and CI test coverage are not ready. |

## Review basis and scope

The repository and `docs/IMPLEMENTATION/IDENTITY_PARTIAL_REVIEW.md` were reviewed. No local `AGENTS.md` or `docs/ENGINEERING_HANDBOOK/` tree exists in this checkout. The approved Engineering Handbook was therefore used from the connected source supplied for the project. Its relevant requirements include a modular monolith, controller → DTO → service → repository → Prisma direction, organization-scoped authorization through memberships, secure session rotation, explicit configuration, auditability, and testable database migrations.

## What is sound

- The pnpm/Turbo workspace layout and base TypeScript configuration are present.
- The active Nest bootstrap has request/correlation IDs, global validation, a response envelope, exception filter, Swagger bootstrap, and a basic health endpoint.
- The current Identity schema separates `Person` from `User`; grants roles through `OrganizationMembership`/`MembershipRole`; hashes password, refresh, and verification values at rest; and uses restrictive foreign-key deletes.
- The migration includes useful database-level checks, indexes, membership foreign keys, and a trigger preventing a private role from being assigned across organizations.
- Local Compose defines persistent PostgreSQL, Redis, pgAdmin, MinIO, and Mailpit services with health checks and a named network.
- The most recent repository verification reported successful lint, typecheck, test, build, Prisma format/validate, and client generation. The database integration suite was skipped without `IDENTITY_TEST_DATABASE_URL`; no clean PostgreSQL migration was demonstrated.

## High risks

### G1-H01 — Two incompatible backend/database architectures coexist

**Evidence:** The active database schema is `prisma/schemas/`, while `apps/api/prisma/schema.prisma` defines a different tenant/user/role/invoice model. `apps/api/src/auth`, `agreements`, and `invoices` target that legacy model. `apps/api/tsconfig.json` explicitly compiles only `main.ts`, `app.module.ts`, `core`, `identity`, and `health`, excluding those legacy modules.

**Impact:** The repository can pass CI while retaining code that is incompatible with the generated Prisma client. Future inclusion of a module, a broad tsconfig change, or a Docker build can reintroduce a different identity and tenancy model. This breaks the handbook’s single architectural source of truth.

**Required gate action:** Establish one canonical Prisma schema and one Identity/auth path. Remove, archive outside the application tree, or explicitly isolate the legacy implementation before further Identity changes.

### G1-H02 — The production API container is not buildable from the declared workspace

**Evidence:** `apps/api/Dockerfile` runs `pnpm install --filter @rentalos/api...` and `pnpm --filter @rentalos/api prisma:generate`; the actual package is `@noagent4u/api`, and that package has no `prisma:generate` script. The Dockerfile only copies the API package before installation, despite Prisma being rooted at `prisma/schemas/`.

**Impact:** `docker-compose.production.yml` cannot reliably build the API image. The production path is therefore unverified and misleading.

**Required gate action:** Align Docker build inputs, package filters, Prisma generation, and runtime assets with the canonical workspace before treating production Compose as supported.

### G1-H03 — JWT configuration is unsafe and not validated at startup

**Evidence:** `apps/api/src/identity/identity.module.ts` uses `JwtModule.register({})`. `identity.service.ts` directly reads `process.env.JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`; `.env.example` does not define either secret. Tokens have no issuer, audience, or explicit algorithm verification configuration.

**Impact:** A missing or weak secret can reach runtime; tokens are not scoped to the intended issuer/audience; key lifecycle and rotation are absent.

**Required gate action:** Centralize and validate all JWT configuration at startup, including non-empty distinct secrets/keys, algorithm, issuer, audience, and TTLs, before enabling any authentication flow.

### G1-H04 — Authentication lifecycle violates the approved identity model

**Evidence:** `IdentityService.register()` creates a `REGISTERED` user and immediately issues access and refresh tokens. There is no active verification workflow; `VerifyDto` is unused and `Verification` has no service/controller path.

**Impact:** Unverified identities receive authenticated access, contradicting the documented Registered → Email Verified → Active lifecycle.

**Required gate action:** Do not continue public Identity rollout until activation/verification is designed and implemented as the only route to normal authenticated access.

### G1-H05 — Refresh rotation is race-prone and cannot detect token-family reuse

**Evidence:** `IdentityService.refresh()` independently reads a session, validates the hash, revokes it, and creates the replacement session. There is no transaction or lock. The schema stores `familyId` and `parentSessionId` but has no consumed/replaced/reuse detection state or family-wide revocation operation.

**Impact:** Concurrent refreshes can issue multiple valid successor tokens. A stolen already-used refresh token cannot reliably trigger security containment.

**Required gate action:** Define and test an atomic rotation/reuse-detection design before authentication is relied upon.

### G1-H06 — Runtime authorization is not ready for organization isolation

**Evidence:** The active `IdentityModule` provides only controller, service, repository, and JWT module. It has no access-token guard, organization-context resolver, permission guard, policy service, or permission decorator. The access token carries only `sub`.

**Impact:** The database has membership-role data, but there is no runtime mechanism to resolve the active organization or enforce membership permissions. Tenant isolation will be easy to bypass in subsequent modules.

**Required gate action:** Define the request organization context and membership-permission evaluation contract before any protected module is brought into the active application.

### G1-H07 — Migration claim and migration safety are not proven

**Evidence:** The first migration uses unconditional `CREATE TYPE`, `CREATE TABLE`, and index statements. It is an initial clean-database migration, not an additive migration that can apply to a database created from the prior un-migrated schema. The database suite skips unless `IDENTITY_TEST_DATABASE_URL` is supplied, and CI does not provide one.

**Impact:** It may fail against an existing environment despite the migration header’s “additive” claim. Constraints/triggers and seed behavior have not been validated in PostgreSQL by CI.

**Required gate action:** Define the baseline/upgrade path, prove `migrate deploy` on a clean database and any supported predecessor, and execute that suite in CI.

## Medium risks

- **G1-M01 — Repository pattern is inconsistent.** `IdentityRepository` subclasses `PrismaClient`, owns its own connection lifecycle, and exposes Prisma-shaped data; `common/PrismaService` is a second Prisma client implementation. This undermines a single database boundary and transaction propagation.
- **G1-M02 — Active controllers and DTOs have incomplete API contracts.** Identity endpoints return service objects directly, have no response allow-lists or error responses, and Swagger only describes operation summaries. The global response envelope is not represented in endpoint schemas.
- **G1-M03 — Configuration is a module name rather than a configuration system.** `packages/config` is empty; `ConfigModule` loads environment variables but validates none. Development and production examples use different database names and only production lists JWT values.
- **G1-M04 — Security controls expected at the platform boundary are absent.** No rate limiting, lockout, CORS policy, security headers, request-size policy, or audit-event writer is configured. The exception filter does not log unexpected exceptions.
- **G1-M05 — Health checks are liveness-only.** `GET /health` returns a constant response; it does not verify PostgreSQL, Redis, queues, or migration readiness. Production app containers also define no health check.
- **G1-M06 — CI does not run typecheck explicitly, Prisma validation/generation, migration deployment, seed validation, container build, or a database-backed integration test.** Its Node/pnpm versions also differ from the root engine/package-manager declaration.
- **G1-M07 — Docker images use mutable tags.** `pgadmin4:latest`, `minio/minio:latest`, and `axllent/mailpit:latest` are not reproducible. Redis persistence has no password/TLS configuration.
- **G1-M08 — Shared packages are mostly empty and `packages/contracts` is not in `pnpm-workspace.yaml`.** Its name still uses `@rentalos/contracts`, creating another namespace inconsistency.
- **G1-M09 — Documentation is stale.** `README.md` says the milestone has no application code, authentication, Prisma models, or migrations. It no longer describes the repository that engineers will execute.
- **G1-M10 — Schema performance/lifecycle details remain incomplete.** Soft-deleted records are not consistently excluded by repository queries; `parentSessionId` is not a self-referential foreign key; session family revocation is not modelled; and audit events are never written by active services.

## Low risks

- Formatting is inconsistent in retained legacy files, reducing reviewability.
- `IdentityAuditEvent` has no `updatedAt`/deletion policy, although immutable events should normally not require either; the retention policy is undocumented.
- The root `clean` script is destructive to installed dependencies and has no confirmation guard.
- `apps/mobile` exists outside the declared workspace and is not covered by the root quality gates.

## Architecture and dependency assessment

The intended direction is appropriate: apps should depend on shared packages, API controllers should depend on application services, services on repositories, and repositories on Prisma. The active Identity path broadly follows that shape, but it does not yet support transactions through repository methods and creates a dedicated `PrismaClient` in the repository.

No circular dependency is visible in the compiled `AppModule → IdentityModule/HealthModule` graph. This is not sufficient assurance because the legacy Auth/Agreement/Invoice graph is intentionally excluded from compilation. Its imports show a separate `AuthModule → common Prisma` topology and tenant-role model, which is a dormant but material architecture fork.

## Immediate recommendations (gate blockers)

1. Select and enforce one canonical Prisma schema, Identity module, and authentication contract; quarantine the excluded legacy API/schema implementation.
2. Repair and verify the production Docker build against the canonical package names and Prisma layout.
3. Introduce validated configuration and secure JWT policy before enabling any login/register flow.
4. Complete the identity lifecycle: verification/activation, transactional registration, and atomic refresh rotation with reuse containment.
5. Implement organization context plus membership-based authorization before activating any organization-scoped resource module.
6. Make database migration deployment and constraint tests mandatory in CI using an isolated PostgreSQL service.
7. Establish one shared Prisma/database provider and transaction boundary; repositories must accept transaction clients rather than independently subclassing clients.
8. Update README, Docker/CI instructions, and environment examples to match the executable repository.

## Long-term recommendations

- Add explicit API response DTOs, documented error contracts, versioning policy, and complete Swagger security metadata.
- Add structured logs with redaction, audit-event production, trace propagation, metrics, and readiness checks for PostgreSQL/Redis/queues.
- Pin container images by version/digest; define secrets injection, backup/restore, Redis authentication, and production network policy.
- Expand the shared package layer only where it prevents real duplication: configuration, database access, contracts, validation, and UI primitives.
- Add focused unit/API/integration suites, mutation-sensitive authorization tests, concurrency tests for rotation and provisioning, and migration upgrade tests.

## Gate conclusion

The project is **not approved to continue Identity implementation on the current baseline**. Resolve the high-risk architecture fork and production/migration/security foundations first. After those prerequisites, rerun G1 with a live clean PostgreSQL migration and container build as evidence.
