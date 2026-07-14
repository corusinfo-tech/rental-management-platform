# ADR-G2.2-001 Implementation Report

## Result

**CONDITIONAL MERGE RECOMMENDATION.** The approved secure-delivery foundation is implemented and all local static/unit checks pass. The migration and database integration suite remain unverified because Docker Desktop/PostgreSQL is unavailable in this environment.

## Files changed

- `prisma/schemas/identity.prisma`
- `prisma/migrations/20260713203000_verification_delivery_envelope/migration.sql`
- `apps/api/src/config/environment.ts`
- `apps/api/src/identity/verification/verification-envelope.service.ts`
- `apps/api/src/identity/repositories/identity.repository.ts`
- `apps/api/src/identity/registration/public-registration.service.ts`
- `apps/api/src/identity/verification/email-verification.service.ts`
- `apps/api/src/identity/identity.module.ts`
- `apps/api/test/verification-envelope.service.test.mjs`
- Existing registration and verification unit tests, environment example, Identity README, ADR, and closure report.

## Database changes

Migration: `20260713203000_verification_delivery_envelope`

It adds `VerificationDeliveryEnvelope` and `VerificationDeliveryEnvelopeStatus`. The envelope has a one-to-one, restrict-delete relationship to `Verification`; its unique `verificationId` supports the required lookup and enforces one envelope per verification. Status, expiry, and creation-time indexes support worker claiming, expiry handling, and retention operations.

## Configuration and encryption design

- `VERIFICATION_ENCRYPTION_KEY` is required at startup and must be canonical base64 for exactly 32 bytes.
- `VERIFICATION_KEY_VERSION` is required at startup.
- `ConfigModule` is the only application boundary that exposes this configuration; no encryption code reads `process.env`.
- AES-256-GCM uses a fresh random 96-bit nonce and separately stored authentication tag.
- Canonical AAD binds `verificationId`, `organizationId`, `userId`, and `correlationId`.
- The `Verification` table retains only an Argon2 secret hash. The ordinary outbox has only verification, organization, user, and correlation IDs.

## Envelope lifecycle and worker contract

Creation of the verification hash, envelope, audits, and outbox event occurs inside one Prisma transaction for public registration and the existing email-verification request/resend flow. Envelopes are destroyed on replacement, expiry, attempt exhaustion, and successful confirmation. Destruction nulls ciphertext, nonce, tag, and AAD and records status/timestamp.

`VerificationDeliveryProcessor` is an interface for a future authorised worker with `loadEnvelope`, `decrypt`, `deliver`, and `destroy` operations. No worker, queue consumer, SMTP integration, or external provider was implemented.

## Tests added

`verification-envelope.service.test.mjs` covers successful encryption/decryption, AAD mismatch/tampering, ciphertext tampering, wrong nonce, wrong key, key-version mismatch, expiry rejection, and destruction output. Existing registration and verification tests now assert envelope persistence and lifecycle calls.

Local result: **19 API unit tests passed; 0 failed.** The existing database test is skipped without `IDENTITY_TEST_DATABASE_URL`.

## Verification results

| Command | Outcome |
| --- | --- |
| `pnpm exec prisma format --schema prisma/schemas` | Passed |
| `pnpm exec prisma validate --schema prisma/schemas` | Passed |
| `pnpm exec prisma generate --schema prisma/schemas` | Passed |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed; PostgreSQL integration test skipped because no test URL/container is available |
| `pnpm build` | Passed |
| Docker/PostgreSQL migration and integration tests | Skipped; `docker` is unavailable in this execution environment |

## Known risks

- A deployment must supply a key through the approved secret-management boundary and retain prior key material for any supported in-flight key versions; this ADR foundation rejects unavailable versions safely.
- The database migration must be applied and verified on a disposable PostgreSQL 16 instance before merge.
- A future worker must implement atomic claiming/completion, delivery retry/dead-letter policy, and audit events for decryption failure and post-delivery destruction without logging protected material.
- No SMTP/provider delivery is included by design.
