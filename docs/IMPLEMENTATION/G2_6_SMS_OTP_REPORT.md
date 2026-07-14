# G2.6 — SMS OTP Verification Report

## Implementation

SMS verification is implemented as a thin `SmsVerificationService` adapter over `VerificationEngine`. Requests resolve an E.164 mobile without revealing whether it exists, then create/resend an `SMS_OTP` verification through the engine. This reuses the existing Argon2 hash, secure delivery envelope, expiry, cooldown, attempt limit, replay protection, audit, and ID-only outbox mechanisms.

`SmsChannel` now generates six-digit OTP values, validates their format, and prepares the opaque `verificationId.otp` token for the encrypted envelope. Delivery remains provider-free. `SmsProvider` defines only `send()` and `health()` for a future authorised worker/provider integration.

On confirmation, the engine validates the expected `SMS_OTP` purpose and invokes the SMS completion hook in the same transaction. The hook writes the SMS-verification audit event and emits `SmsVerified` without secret material.

## API

- `POST /api/v1/auth/sms-verification/request`
- `POST /api/v1/auth/sms-verification/confirm`

Swagger documents both endpoints. The request DTO enforces E.164 mobile format; all accepted/invalid/replayed account-state paths receive generic public responses.

## Files

- `verification-engine/verification-channel.ts`
- `verification-engine/sms-provider.ts`
- `sms-verification/sms-verification.service.ts`
- Identity module, controller, DTOs, and unit tests.

## Tests and verification

Coverage includes OTP generation/format validation, engine routing, generic unknown-account behavior, SMS confirmation hook, audit/outbox output, and remaining provider-free channel stubs.

- API tests: **28 passed, 0 failed**.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.

## Known risks

No real SMS provider, notification worker, or delivery attempt processing is included by design. Docker/PostgreSQL is unavailable, so database integration tests for expiry, replay, cooldown, and concurrent confirmation must run against disposable PostgreSQL before release.

## Merge recommendation

**CONDITIONAL** — implementation and local verification pass; required live database integration remains outstanding.
