# G2.1A — Public Registration Hardening Report

**Status:** Implemented  
**Merge recommendation:** **CONDITIONAL MERGE** — source quality gates pass; merge only after CI runs the clean PostgreSQL integration suite and Docker Compose validation.

## Architecture changes

- Added a Redis-backed, route-specific registration throttle. It applies independent IP and HMAC-fingerprinted identifier counters, uses ConfigModule values, respects Express `trust proxy` configuration, and writes privacy-safe throttle audit events.
- Replaced the public duplicate conflict outcome with one idempotent `202 { accepted: true }` response. Database unique constraints remain the authority; `P2002` conflicts are deliberately translated to the same accepted response.
- Added transactional outbox persistence. Each new registration writes `UserRegistered` and `VerificationRequested` events in the same Prisma transaction as its identity records.
- Applied the approved organization policy: tenant registration creates no organization or membership; landlord registration creates one organization, an active owner membership (`isOwner = true`), and a `LANDLORD` membership role.
- Added request JSON size enforcement, proxy-aware source IP handling, normalized DTO transformations, and global-envelope Swagger response/error documentation.

## Database changes

**Migration:** `20260713193000_public_registration_hardening`

- Adds `OutboxEventStatus` and `OutboxEvent` with pending/processing/processed/failed state, attempt count, timestamps, aggregate routing, optional organization relation, and delivery-worker indexes.
- Adds `OrganizationMembership.isOwner`.
- Adds a partial unique index to allow at most one active owner membership per organization.

### Outbox events

| Event | Aggregate | Payload contents |
|---|---|---|
| `UserRegistered` | `User` | User ID, registration type, and status only. |
| `VerificationRequested` | `Verification` | Verification ID, user ID, channel, and purpose only. |

No password, raw verification secret, full email, or mobile number is placed in the audit log or outbox payload. Delivery workers remain out of scope.

## Business rules and documentation

- [Public registration business rules](../BUSINESS_RULES/PUBLIC_REGISTRATION.md)
- [Identity module registration guide](../../apps/api/src/identity/README.md)
- [API registration contract](../API.md)
- [Prisma migration documentation](../../prisma/README.md)

## Files changed

- `apps/api/src/config/environment.ts`, `apps/api/src/main.ts`, `.env.example`, `.env.production.example`
- `apps/api/src/identity/controllers/identity.controller.ts`
- `apps/api/src/identity/dto/auth.dto.ts`
- `apps/api/src/identity/registration/public-registration.service.ts`
- `apps/api/src/identity/registration/registration-throttle.service.ts`
- `apps/api/src/identity/repositories/identity.repository.ts`, `apps/api/src/identity/identity.module.ts`
- `prisma/schemas/identity.prisma`, `prisma/schemas/organization.prisma`
- `prisma/migrations/20260713193000_public_registration_hardening/migration.sql`
- `apps/api/test/*registration*.test.mjs`, `tests/identity-database.test.mjs`
- `docs/BUSINESS_RULES/PUBLIC_REGISTRATION.md`, `docs/API.md`, `apps/api/src/identity/README.md`, `prisma/README.md`
- `apps/api/package.json`, `pnpm-lock.yaml` (required `ioredis` client)

## Tests added or updated

- Redis throttle behavior and privacy-safe throttle audit data.
- DTO trimming, normalization, whitespace rejection, and Unicode-control rejection.
- Tenant no-organization/no-membership behavior.
- Landlord one-organization/owner-membership/role behavior.
- Idempotent duplicate response behavior and transactional outbox creation.
- Swagger decorator/response-contract coverage.
- Conditional PostgreSQL integration coverage for tenant/landlord persistence, concurrent unique-user protection, outbox creation, and registration rollback.

## Commands executed

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed |
| `pnpm prisma format --schema prisma/schemas` | Passed |
| `pnpm prisma validate --schema prisma/schemas` | Passed with `DATABASE_URL` supplied |
| `pnpm prisma generate --schema prisma/schemas` | Passed with `DATABASE_URL` supplied |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed: 12 API tests; database suite skipped without `IDENTITY_TEST_DATABASE_URL` |
| `pnpm build` | Passed |
| `docker compose config` | Not run: Docker executable is unavailable on this host |

## Coverage

No coverage collector is configured in this repository. The executed API suite contains 12 passing tests. PostgreSQL integration tests are present but were not executed because `IDENTITY_TEST_DATABASE_URL` is not configured.

## Known limitations and remaining risks

- A Docker-capable CI runner must execute `docker compose config` and bring up Redis/PostgreSQL before release.
- A clean isolated PostgreSQL database must execute migration, seed, and the conditional registration integration suite.
- The outbox intentionally contains no delivery worker and no plaintext verification secret. A future worker must implement the approved secret-generation/delivery lifecycle without logging or persisting raw secrets.
- The throttle availability depends on Redis by design; Redis is required at application startup rather than silently falling back to process-local counters.
- No authentication, JWT issuance, email/WhatsApp/OTP delivery, password reset, organization API, or worker was added.
