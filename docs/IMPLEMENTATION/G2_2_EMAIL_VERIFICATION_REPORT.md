# G2.2 — Email Verification Report

## Architecture changes

Added public request and confirm email-verification lifecycle services and endpoints. Requests are normalized and existence-neutral. Confirmation uses opaque `verificationId.secret` tokens, Argon2 verification, expiry/attempt/status checks, conditional consumption for replay protection, and generic responses.

## Migration

`20260713194500_email_verification_lifecycle` adds `VERIFIED` to `VerificationStatus` and extends the lifecycle trigger so expired verifications cannot be successfully consumed.

## Events and audit entries

- Outbox: `VerificationRequested`, `EmailVerified`; payloads contain only organization/user/verification/correlation IDs.
- Audit: verification requested, success, expired, replay attempt, and attempt limit reached.

## Business rules

Tenant users move from `PENDING_EMAIL` to `ACTIVE`; landlords remain `PENDING_REVIEW` after verified email. Request and confirmation responses do not reveal account or token state. No plaintext token, secret, email, or password is written to audit/outbox data.

## Swagger and tests

Swagger documents both endpoints, global envelopes, validation errors, and generic outcomes. Unit coverage includes generation, confirmation, success event/audit, and replay/malformed generic response behavior. Existing conditional PostgreSQL integration coverage remains available when `IDENTITY_TEST_DATABASE_URL` is supplied.

## Verification results

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed during G2.1A; no dependency changes in G2.2 |
| `pnpm prisma format` | Passed |
| `pnpm prisma validate` | Passed with `DATABASE_URL` supplied |
| `pnpm prisma generate` | Passed with `DATABASE_URL` supplied |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed: 16 API tests; PostgreSQL suite skipped without `IDENTITY_TEST_DATABASE_URL` |
| `pnpm build` | Passed |

## Coverage and known risks

No coverage collector is configured. The API suite has 16 passing tests, including verification generation, confirmation, replay, expiration, attempt limit, transition, audit, and outbox behavior. Docker/PostgreSQL integration cannot run on this host without Docker and `IDENTITY_TEST_DATABASE_URL`. No provider, worker, SMTP, JWT, login, OTP, or WhatsApp capability was added. The ID-only outbox intentionally does not carry a plaintext token; the future delivery worker must implement the approved secure hand-off lifecycle.

## Merge recommendation

**CONDITIONAL MERGE** after a clean PostgreSQL migration/integration run in CI.
