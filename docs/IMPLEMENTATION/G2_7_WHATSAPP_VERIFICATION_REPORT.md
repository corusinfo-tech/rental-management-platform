# G2.7 — WhatsApp Verification Report

## Architecture

WhatsApp verification is a thin `WhatsAppVerificationService` adapter over `VerificationEngine`. It creates and validates `WHATSAPP_OTP` records through the existing secure envelope, transactional outbox, audit, cooldown, expiry, attempt-limit, and replay-protection paths. No separate verification persistence or token logic was introduced.

`WhatsAppChannel` extends the shared OTP channel base used by `SmsChannel`; both generate and validate the same six-digit OTP strategy. `WhatsAppProvider` defines only `send()` and `health()` for a future worker boundary. No Meta, Gupshup, Twilio, or other provider implementation exists.

## API

- `POST /api/v1/auth/whatsapp-verification/request`
- `POST /api/v1/auth/whatsapp-verification/confirm`

Requests require E.164 mobile input and return a generic accepted response regardless of account existence. Confirmation enforces `WHATSAPP_OTP` purpose and emits the ID-only `WhatsAppVerified` outbox event plus the corresponding audit event in the engine completion transaction.

## Tests and verification

Added shared-OTP channel coverage and WhatsApp request/confirmation routing coverage, including generic handling and audit/outbox assertions.

- API tests: **31 passed, 0 failed**.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.

## Known risks

Provider delivery and workers are intentionally absent. Docker/PostgreSQL integration tests for expiry, replay, cooldown, attempt exhaustion, and concurrent confirmation remain required before release.

## Merge recommendation

**CONDITIONAL** — local implementation and verification pass; disposable PostgreSQL integration validation remains outstanding.
