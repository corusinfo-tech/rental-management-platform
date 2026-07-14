# P1.3 — SMTP Email Provider Report

## Result

**CONDITIONAL — provider boundary and configuration are implemented; verified SMTP transport is blocked by the unavailable dependency environment.**

## Architecture

`SmtpEmailProvider` implements the worker `EmailProvider` contract and is resolved only through `NotificationProviderRegistry`. It accepts a validated SMTP configuration and injected `SmtpTransport`; the worker remains independent of SMTP details.

`send()` uses the outbox event ID as its idempotency key, creates the minimal common email message (`from`, `to`, optional reply-to, subject, text, message ID), and suppresses duplicate successful sends within the provider process. `health()` delegates connectivity validation to the transport and returns structured provider health without sending an email.

## Configuration

`validateSmtpConfig` is the worker configuration boundary for:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_SECURE`
- `SMTP_FROM`
- `SMTP_REPLY_TO`

It validates port bounds and requires username/password as a pair. `.env.example` documents development Mailpit-compatible values. No SMTP credentials or message bodies are logged by the provider.

## Retry and worker flow

The existing outbox worker owns retry/DLQ. The handler resolves `SmtpEmailProvider` from the registry, passes its event ID as idempotency key, and destroys the secure envelope only after provider `send()` resolves. A transport failure propagates to the worker retry policy.

## Known risks and blockers

- No verified concrete `SmtpTransport` implementation is included. A production transport should be implemented with an approved SMTP library or fully tested native transport, supporting TLS/STARTTLS and authentication.
- Process-local idempotency is insufficient across worker restarts; the outbox state/lease and provider idempotency header must be validated with a real SMTP test server.
- Package verification cannot currently run because pnpm reconstructs dependencies and network resolution is unavailable.
- Docker is unavailable, preventing Mailpit and PostgreSQL integration tests.

## Recommendation

**CONDITIONAL.** Do not claim SMTP delivery is production-ready until a concrete transport, Mailpit integration tests (send, health, failure, retry, idempotency), and worker end-to-end envelope destruction test pass.
