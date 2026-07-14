# G2.3 — Generic Verification Engine Report

## Architecture

`VerificationEngine` is the single service responsible for creating, resending, validating, consuming, revoking, expiring, and cleaning up verifications. It is channel-independent and owns the transactional creation of the Argon2 verification hash, AES-GCM delivery envelope, audit events, and ID-only outbox event.

The public email service is now only an adapter: it resolves an eligible user, delegates to the engine, and supplies the email-status transition as an in-transaction completion hook. This preserves the previous atomic verification and user-status transition.

```text
EmailChannel → VerificationEngine → Verification + DeliveryEnvelope + Audit + Outbox → future worker
```

## Files and classes

- `verification-engine/verification-engine.service.ts` — `VerificationEngine`
- `verification-engine/verification-channel.ts` — `VerificationChannel`, `EmailChannel`, and provider-free SMS, WhatsApp, password-reset, magic-link, and invitation stubs
- `verification/email-verification.service.ts` — public email adapter
- `verification/verification-envelope.service.ts` — existing secure-envelope implementation reused without duplication
- `identity.repository.ts` — generic verification persistence operations
- `environment.ts` — `verification` configuration section

## Enums and events

The Prisma vocabulary is additive: `SMS`, `SMS_OTP`, `WHATSAPP_OTP`, `MAGIC_LOGIN`, `INVITATION`, `MFA`, `DELIVERED`, `FAILED`, and `ATTEMPTS_EXCEEDED` were added. `Verification.resendCount` was added with default zero.

Engine outbox events are `VerificationCreated`, `VerificationResent`, `VerificationVerified`, `VerificationExpired`, `VerificationRevoked`, and `VerificationAttemptsExceeded`. Audit actions cover request, verified, revoked, expired, replay, failure, and secure-envelope creation. Event payloads contain only verification, organization, user, and correlation identifiers.

## Configuration

Verification settings now live in `Environment.verification`: email expiry, cooldown, maximum attempts, maximum resends, and request rate-limit settings. `EMAIL_VERIFICATION_MAX_RESENDS` is documented in `.env.example`.

## Database migration

`20260713210000_verification_engine_foundation` is additive. It adds the engine enum values, `resendCount`, and a channel/purpose/status/expiry index. It does not duplicate the existing Verification or delivery-envelope models.

## Tests and verification

Added channel unit coverage for Email token generation and all requested stub channels. Updated email-adapter and registration tests to assert engine routing.

- API unit tests: **20 passed, 0 failed**.
- `pnpm exec prisma format --schema prisma/schemas`: passed.
- `pnpm exec prisma validate --schema prisma/schemas`: passed.
- `pnpm exec prisma generate --schema prisma/schemas`: passed.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`: passed.
- PostgreSQL integration tests remain skipped because `IDENTITY_TEST_DATABASE_URL` and Docker are unavailable in this environment.

## Known risks

- No provider or worker is implemented; the stub channels intentionally reject use.
- The migration must be applied and exercised on a disposable PostgreSQL 16 instance before release.
- A future worker must implement delivery claiming, delivery status, retry/dead-letter handling, and envelope destruction after delivery.

## Merge recommendation

**CONDITIONAL.** Code quality checks and unit tests pass. Merge after the additive migration and end-to-end engine lifecycle are validated against disposable PostgreSQL infrastructure.
