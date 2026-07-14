# G2.1 Public Registration — Architecture and Security Review

**Review date:** 2026-07-13  
**Scope:** Active `POST /api/v1/auth/register` implementation only. Legacy code was excluded.  
**Result:** **FAIL**  
**Merge recommendation:** **DO NOT MERGE** until the High issues below are resolved or an explicit security exception is approved.

## Review basis and limitation

`AGENTS.md` and `docs/ENGINEERING_HANDBOOK/` are not present in this checkout. This review therefore uses the active implementation plus the Handbook-derived requirements recorded in `GATE_G1_REVIEW.md`, `G1_RECOVERY_01.md`, and `G1_SECURITY_REPORT.md`: controller → DTO → service → repository → Prisma direction; membership-based RBAC; normalized identifiers; hash-only secrets; atomic identity writes; auditability; and public-endpoint abuse protection.

## Summary

The registration application service correctly owns the multi-entity workflow, uses one Prisma transaction, normalizes identifiers, hashes the password and verification secret, assigns only membership roles, and returns a small allow-listed payload. PostgreSQL uniqueness and role-scope protections are the ultimate controls for duplicate and cross-organization races.

It is nevertheless unsafe to expose as a public endpoint. There is no rate limit, bot control, or registration-abuse policy; a caller can distinguish a registered email/mobile from an unused pair by comparing `201` and `409`; and the generated verification secret is discarded before any secure hand-off to an outbox or delivery workflow, leaving a pending record that cannot be verified later. The implicit creation of one organization per registration is also an undocumented tenancy decision rather than an explicit business rule.

## Critical issues

None identified.

## High issues

### G2.1-H01 — Public registration has no abuse protection

**Evidence:** `apps/api/src/identity/controllers/identity.controller.ts:11-17` exposes the endpoint publicly. `apps/api/src/app.module.ts:11-25` and the active controller contain no throttling guard, rate-limit middleware, CAPTCHA/anti-automation integration, registration quota, or IP/device control. The existing G1 review records this platform-boundary requirement in `docs/IMPLEMENTATION/GATE_G1_REVIEW.md` (G1-M04).

**Impact:** Attackers can exhaust Argon2 work, create unbounded organizations/users/verification rows, enumerate account state at scale, and impose database and operational cost.

**Recommendation:** Apply a route-specific distributed rate limit keyed by normalized IP plus identifier-derived privacy-safe key, enforce a request-size limit, and define an abuse-control escalation mechanism before public exposure. Record rate-limit decisions without logging credentials or raw identifiers.

### G2.1-H02 — Registration outcome permits account enumeration

**Evidence:** `apps/api/src/identity/registration/public-registration.service.ts:33-40` looks up both identifiers and throws a `ConflictException` if either exists; `:86-89` maps a concurrent unique-index conflict to the same exception. `apps/api/src/identity/controllers/identity.controller.ts:11-14` returns `201` for a new account. Thus an otherwise valid request gives `201` when both values are unused and `409` when either value already exists.

**Impact:** An attacker can discover whether an email or mobile is registered. A generic conflict text removes field-level disclosure, but status-based disclosure remains.

**Recommendation:** Define the product policy explicitly. If anti-enumeration is required, return an indistinguishable accepted response for both new and existing requests while making all side effects idempotent and avoiding duplicate delivery. Pair this with H01; status normalization without abuse protection is insufficient.

### G2.1-H03 — Verification records cannot participate in a future delivery/verification flow

**Evidence:** `apps/api/src/identity/registration/public-registration.service.ts:28-29` generates and hashes a random secret; `:67-74` stores only the hash; the raw secret is deliberately discarded. No outbox message, encrypted one-time hand-off, provider request, or delivery provider is created. `Verification` is consequently left `PENDING` (`prisma/schemas/identity.prisma:159-179`) with no value ever delivered to the registrant.

**Impact:** The created record cannot be validated by a later endpoint because the corresponding raw secret no longer exists anywhere. A later delivery story must revoke and replace it, making this record operationally dead and potentially confusing for audit and support.

**Recommendation:** Before merging the public endpoint, define the approved hand-off boundary: create the hash and a transactional outbox event carrying the raw one-time secret only to the delivery worker, or defer creation of the verification record until the delivery workflow can atomically create and dispatch it. The secret must never be logged, returned in the API response, or persisted in plaintext.

### G2.1-H04 — One organization per public registration is an undocumented tenancy decision

**Evidence:** `apps/api/src/identity/registration/public-registration.service.ts:56-61` creates a new `Organization` named `TENANT registration` or `LANDLORD registration` for every request. The request DTO has no organization identifier, invitation, or tenancy-selection input (`apps/api/src/identity/dto/auth.dto.ts:9-19`).

**Impact:** Every tenant and landlord receives a separate organization, including organizations with identical names. This may be incompatible with the intended tenant-to-landlord membership model, produces orphaned registration organizations, and fixes a business/tenancy policy implicitly in application code.

**Recommendation:** Obtain and document the Handbook-approved registration tenancy rule before merge. Model an explicit registration context or invitation/organization selection if that is the intended relationship. If a private pre-organization is intended, give it an explicit lifecycle, ownership rule, and later promotion/merge policy.

## Medium issues

### G2.1-M01 — Name validation accepts values that become empty after normalization

**Evidence:** `apps/api/src/identity/dto/auth.dto.ts:10-11` applies `IsString` and `MaxLength`, but neither `IsNotEmpty` nor a non-whitespace pattern. `apps/api/src/identity/registration/public-registration.service.ts:47-48` then trims both names before persistence.

**Impact:** A request with whitespace-only names passes DTO validation and stores empty `Person.firstName`/`lastName` values.

**Recommendation:** Validate trimmed non-empty names and define permitted character/locale rules in the DTO/value object.

### G2.1-M02 — The response body documented in Swagger does not match the actual envelope

**Evidence:** The controller declares `@ApiCreatedResponse({ type: RegistrationResponseDto })` at `apps/api/src/identity/controllers/identity.controller.ts:14`. The global interceptor wraps every success as `{ success, data, meta }` at `apps/api/src/core/http/global-response.interceptor.ts:10-18`.

**Impact:** Generated API clients and integration consumers may expect `userId` at the response root even though it is at `data.userId`.

**Recommendation:** Publish a reusable Swagger response-envelope schema and use it for this endpoint, retaining `RegistrationResponseDto` as the `data` payload type.

### G2.1-M03 — Audit event lacks operational context and outcome information

**Evidence:** `apps/api/src/identity/registration/public-registration.service.ts:75-81` writes only `subjectUserId`, `action`, and `registrationType`. `IdentityAuditEvent` has no request/correlation/IP/user-agent fields (`prisma/schemas/identity.prisma:181-192`).

**Impact:** The event proves that a registration was submitted but does not support meaningful forensic correlation, abuse investigation, or distinguishing successful/failed attempts.

**Recommendation:** Define the security-audit schema and redaction policy. Record correlation/request identifiers and privacy-reviewed network/device metadata, and create separate non-sensitive events for rejected/rate-limited registration attempts where justified.

### G2.1-M04 — Transaction isolation is adequate for correctness but not optimized for duplicate-request work

**Evidence:** `apps/api/src/identity/repositories/identity.repository.ts:9-11` uses a `ReadCommitted` transaction. The pre-checks at `public-registration.service.ts:33-40` race by design, while the `User` unique indexes (`prisma/migrations/20260713160000_identity_database_foundation/migration.sql:149-151`) and P2002 handling (`public-registration.service.ts:86-89`) preserve correctness.

**Impact:** Concurrent identical requests do not create duplicate users, but the losing request still performs Argon2 hashing before the transaction (`:27-29`) and reaches a database conflict. This increases cost under abuse and is not idempotent.

**Recommendation:** Keep the database constraints as the final authority. After H01, add an idempotency strategy appropriate to the product and consider a short-lived privacy-safe duplicate suppression mechanism; do not weaken the unique constraints or rely on pre-checks alone.

## Low issues

### G2.1-L01 — Registration-specific tests are not executed against a real HTTP server and database in this environment

**Evidence:** API tests in `apps/api/test/` test normalization, service behavior, and source architecture. The database integration suite in `tests/identity-database.test.mjs` is conditional on `IDENTITY_TEST_DATABASE_URL`; the prior verification output reports it skipped when no test database is configured.

**Impact:** The SQL migration, controller envelope/status, and full transaction behavior are not proven together in a clean PostgreSQL environment.

**Recommendation:** Add CI service-container tests that run migration/seed and exercise `POST /api/v1/auth/register` against PostgreSQL, including concurrent duplicate requests and rollback on each intermediate write failure.

### G2.1-L02 — No explicit password-strength policy beyond length is visible

**Evidence:** `apps/api/src/identity/dto/auth.dto.ts:13` requires a string of 12–128 characters; `public-registration.service.ts:27` hashes it with Argon2.

**Impact:** The password storage control is sound, but the acceptance policy may permit known weak long passwords unless a broader platform policy exists elsewhere.

**Recommendation:** Align with the Handbook’s password policy (length, breach-password screening, and usability rules) when that policy is available; avoid composition rules that reduce passphrase usability.

## Control assessment

| Review area | Assessment | Evidence |
|---|---|---|
| Transaction boundaries | Pass | One service-owned transaction covers user, organization, membership, role, verification, and audit writes (`public-registration.service.ts:31-85`). |
| Email/mobile races and constraints | Pass with M04 caveat | Pre-checks are backed by unique indexes and P2002 translation. Email and mobile have normalized/E.164 checks in migration lines 45-47 and unique indexes at 150-151. |
| Password and verification hashing | Pass | Argon2 hashes are created at service lines 27-29; database checks require `$argon2%` for both columns. |
| Organization isolation/RBAC assignment | Pass structurally; H04 business-policy concern | Roles are assigned through `MembershipRole`; the private-role trigger prevents cross-organization assignment (migration lines 187-212). |
| DTO validation | Partial | Email, type, country code, mobile syntax, and password length exist; names lack non-empty validation. |
| Response and HTTP status | Partial | `201` is explicit and correct; Swagger omits the global response envelope. |
| Error leakage and timing | Partial | Conflict text is generic; status remains enumerable. Argon2 runs before the duplicate lookup, reducing a simple early-return timing oracle, but status and downstream work still differentiate outcomes. |
| Sensitive-data logging | Pass for this flow | No registration logging call or raw-secret persistence is present. Broader log-redaction policy is outside this story. |
| Scalability | Fail pending H01/H04 | Unbounded expensive public work and one organization per registration require an approved operating model. |

## Merge decision

**FAIL — do not merge for public exposure.** The core persistence design is directionally correct, but H01 through H04 must be resolved or explicitly accepted by security and product architecture. After that, run the real PostgreSQL HTTP integration suite and verify the documented Swagger envelope before reconsidering the merge.
