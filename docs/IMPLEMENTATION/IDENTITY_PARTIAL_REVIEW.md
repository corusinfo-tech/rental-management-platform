# Identity Partial Implementation Review

## Scope and basis

Reviewed the uncommitted Identity implementation against the supplied Engineering Handbook (Constitution; Database, API, and Backend volumes). Local `AGENTS.md` and the requested local handbook folders are absent; the approved handbook was read from the supplied Google Doc.

## Decision

**Merge recommendation: UNSAFE.** Current completeness is **25%**. Registration, login, and JWT issuance are partially present, but the implementation is not safely deployable and does not meet the requested Identity scope.

## Safe components

- `User` is separated from `Person` at the schema level.
- Passwords and stored refresh tokens use Argon2 hashes; no plaintext token persistence was found.
- Registration does not accept a client-controlled role, avoiding public privileged-role registration in its current form.
- Role assignment is modelled through `MembershipRole`, not directly through `User`.
- Login uses a generic `Invalid credentials` response.

## Findings

### ID-001 — Critical — Refresh-token rotation is non-atomic and has no reuse detection

**Evidence:** `apps/api/src/identity/services/identity.service.ts:20-25` verifies the token, reads the session, revokes it, then calls `issueTokens`. `:27-31` creates a replacement session. These operations have no transaction boundary. `prisma/schemas/identity.prisma:96-106` has no session-family, replacement, or reuse-detection fields.

**Impact:** Concurrent refreshes can each pass the pre-revocation check and issue multiple valid replacement tokens. A failed replacement after revocation logs the user out, and a reused refresh token cannot trigger family-wide revocation. This fails the handbook's rotation and session-integrity requirements.

**Recommended correction:** Perform lookup, token-hash verification, old-session revocation, and replacement-session creation in one serializable transaction; add a token-family/reuse-detection design and revoke the affected session family on reuse.

**Files:** `identity.service.ts`, `identity.repository.ts`, `identity.prisma`.

### ID-002 — Critical — Organization membership has no foreign key or uniqueness constraint

**Evidence:** `prisma/schemas/identity.prisma:73-85` stores a free `organizationId String` with no `Organization` relation or foreign key; it also lacks a composite unique constraint for person/organization membership.

**Impact:** Memberships can reference nonexistent organizations and duplicate memberships can be created. This conflicts with the handbook rule that a membership cannot exist without an Organization and breaks tenant isolation.

**Recommended correction:** Introduce the approved Organization relation/database dependency (without exposing an Organization API module), enforce the foreign key, and add the approved unique membership constraint.

**Files:** `identity.prisma`, future migration.

### ID-003 — Critical — RBAC is data-only; no authentication, authorization, or organization guard exists

**Evidence:** No Identity guards, policies, decorators, or permission checks exist. `identity.module.ts:7` only registers controller/repository/service. `identity.controller.ts:10-12` exposes endpoints with no guards. Access JWTs contain only `sub` (`identity.service.ts:29`).

**Impact:** Roles and permissions are never evaluated; protected resource access cannot be safely implemented. This violates the handbook's JWT → authorization → policy request lifecycle.

**Recommended correction:** Add JWT authentication guard, membership/organization context guard, `@RequirePermissions()` metadata, an RBAC guard/policy service, and permission resolution through membership roles.

**Files:** `identity.module.ts`, new `guards/`, `policies/`, `services/`, `main.ts`.

### ID-004 — High — Registration returns credentials before required email verification

**Evidence:** Schema rules state email verification before activation (`identity.prisma:37-38`), but `identity.service.ts:10-14` immediately issues access and refresh tokens for a `REGISTERED` user.

**Impact:** The documented lifecycle Registered → Email Verified → Active is bypassed. Unverified accounts receive authenticated access.

**Recommended correction:** Create a verification record, publish/send an email verification request, and only issue access tokens after activation; explicitly define any limited pre-verification token separately.

**Files:** `identity.service.ts`, `identity.prisma`, controller/verification service.

### ID-005 — High — Email/WhatsApp/OTP verification is not implemented

**Evidence:** `Verification` is schema-only (`identity.prisma:108-119`). `VerifyDto` exists but is unused (`dto/auth.dto.ts:20-22`); there are no verify, resend, WhatsApp, OTP, or reset-password endpoints.

**Impact:** Required verification and recovery workflows are absent; `activateUser` is unused and has no token verification.

**Recommended correction:** Implement hashed, single-use, expiring verification records; separate channel/purpose types; OTP attempt limits; service-owned channel adapters/events; and documented endpoints.

**Files:** `identity.prisma`, `dto/auth.dto.ts`, `identity.controller.ts`, new verification service/repository/tests.

### ID-006 — High — JWT validation lacks issuer, audience, configuration validation, and key policy

**Evidence:** `identity.module.ts:7` configures `JwtModule.register({})`. `identity.service.ts:21,29-30` reads unvalidated environment secrets directly and signs/verifies without issuer/audience. `.env.example` contains no JWT secrets.

**Impact:** Tokens are not bound to this API/audience; startup can silently use undefined/misconfigured secrets; key rotation cannot be controlled.

**Recommended correction:** Validate JWT configuration at startup; set issuer, audience, algorithm, access/refresh TTL constants, and explicit verification options through ConfigService/JwtModule async configuration.

**Files:** `identity.module.ts`, `identity.service.ts`, `.env.example`, configuration module.

### ID-007 — High — No transaction boundary for registration or token issuance

**Evidence:** Registration checks then creates user (`identity.service.ts:11-12`) and creates session later (`:13`); repository calls are independent. Refresh also revokes then issues (`:24-25`) without a transaction.

**Impact:** Races can create duplicate/partial identity state; failures leave identities without intended session/verification state.

**Recommended correction:** Services initiate transactions for multi-entity workflows; repositories accept the transaction client. Rely on database uniqueness and map unique violations to conflicts.

**Files:** `identity.service.ts`, `identity.repository.ts`.

### ID-008 — High — Schema lacks required audit and lifecycle fields

**Evidence:** Identity models contain only partial timestamps. No `createdBy`, `updatedBy`, soft-delete fields, login-failure tracking, session metadata, verification purpose, attempt count, or audit-log integration exists (`identity.prisma:21-119`).

**Impact:** The implementation cannot satisfy handbook auditability, forensic review, lockout, or verification-abuse controls.

**Recommended correction:** Implement the approved entity attributes and immutable audit events/logs; add failed-login/lockout policy and device/IP metadata subject to privacy standards.

**Files:** `identity.prisma`, service/events/repository.

### ID-009 — High — Unsafe cascade deletion can erase security evidence

**Evidence:** Cascades delete `RolePermission` (`identity.prisma:67-68`), `MembershipRole` (`:90-91`), sessions (`:103`), and verifications (`:116`).

**Impact:** Deleting a user/role can silently destroy authorization/session evidence, contrary to the handbook's audit/archiving posture.

**Recommended correction:** Use lifecycle states/soft archival for identity records; retain security/audit records; restrict cascades to approved pure join records only after migration review.

**Files:** `identity.prisma`.

### ID-010 — Medium — Email/mobile normalization is incomplete

**Evidence:** Registration only lowercases at creation (`identity.service.ts:12`); duplicate lookup uses the original input (`:11`). Login lowercases (`:16`) but neither flow trims/canonicalizes. Mobile is raw unique text (`identity.prisma:35`) and has no DTO input/normalization.

**Impact:** Case/whitespace variants can bypass pre-checks or produce inconsistent authentication identities; mobile uniqueness is unreliable.

**Recommended correction:** Normalize/trim email before every query/write, enforce a normalized database column/collation, and normalize mobile to E.164 before persistence.

**Files:** `identity.service.ts`, `identity.prisma`, DTO validators.

### ID-011 — Medium — Controllers return token objects without response allow-lists

**Evidence:** `identity.controller.ts:10-12` returns service output directly. There are no response DTOs or `@ApiOkResponse` schemas.

**Impact:** Future service changes can accidentally expose hashes, session data, or Prisma fields; Swagger contracts are incomplete.

**Recommended correction:** Map service results to explicit response DTOs containing only approved fields; document success and error responses for every endpoint.

**Files:** `identity.controller.ts`, DTOs, service.

### ID-012 — Medium — Swagger coverage is incomplete

**Evidence:** Only `@ApiTags` and `@ApiOperation` are present (`identity.controller.ts:6,10-12`). Verify/reset/logout/OTP/WhatsApp endpoints are absent; no bearer authentication or response schemas are declared.

**Impact:** The public API contract is incomplete and consumers cannot discover security requirements or response models.

**Recommended correction:** Add all required endpoints and full request/response/auth/error Swagger decorators; configure bearer auth in `main.ts`.

**Files:** `identity.controller.ts`, DTOs, `main.ts`.

### ID-013 — Medium — Missing rate limiting and abuse protections

**Evidence:** No throttler import/guard exists in `app.module.ts` or Identity controller; OTP/login/register flows have no rate-limit code.

**Impact:** Credential stuffing, registration abuse, and OTP brute force are unmitigated.

**Recommended correction:** Apply route-specific limits keyed by IP and normalized identifier; add OTP attempt/retry controls and lockout behavior.

**Files:** `app.module.ts`, `identity.controller.ts`, verification service.

### ID-014 — Medium — Session records omit expiry/revocation safeguards needed for operational security

**Evidence:** `Session` only contains hash, expiry, revocation, and creation (`identity.prisma:96-106`). No family, rotation timestamp, IP/device/user-agent, last-used, revocation reason, or reuse marker exists.

**Impact:** No device/session management, suspicious reuse analysis, or global/family revocation path is possible.

**Recommended correction:** Add approved session metadata and a refresh-token family/reuse-detection design; implement logout and revoke-all flows.

**Files:** `identity.prisma`, repository, service, controller.

### ID-015 — Medium — No tests or runnable test configuration

**Evidence:** `apps/api/package.json:10` defines `test` as TypeScript checking only. No Identity test files, Jest configuration, integration database configuration, or API tests exist.

**Impact:** Required unit, integration, RBAC, JWT, and refresh-rotation behavior is unverified.

**Recommended correction:** Add unit tests for service/policy behavior; isolated PostgreSQL integration tests for repository/transactions; API tests for every auth flow and error boundary.

**Files:** `apps/api/package.json`, new `identity/tests/`, test configuration.

### ID-016 — Low — Registration conflict behavior leaks account existence

**Evidence:** `identity.service.ts:11` throws `ConflictException('Email already registered')`.

**Impact:** Enables account enumeration through registration responses.

**Recommended correction:** Apply the handbook-approved enumeration policy, usually a neutral response for public flows with equivalent timing.

**Files:** `identity.service.ts`, controller/API documentation.

## Components requiring redesign

- Refresh/session lifecycle and token rotation.
- Organization membership persistence and isolation.
- RBAC guard/policy enforcement.
- Verification/OTP/WhatsApp and password-reset flows.
- JWT configuration and startup secret validation.
- Transaction, audit, and test architecture.

## Recommended implementation order

1. Resolve approved Organization foreign-key dependency and complete reviewed Prisma migration.
2. Add normalized identity fields, audit/lifecycle/session/verification constraints.
3. Build transaction-capable repository and registration/activation workflows.
4. Implement JWT configuration, session-family rotation, logout, reuse detection, and guards.
5. Implement RBAC policies from membership roles and permission checks.
6. Implement verification/recovery channels and rate limiting.
7. Add explicit response DTOs, full Swagger contracts, audit events, and complete test suites.
