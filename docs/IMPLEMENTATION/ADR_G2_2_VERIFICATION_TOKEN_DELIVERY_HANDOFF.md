# ADR-G2.2-001 — Verification Token Delivery Hand-off

## Status

**ACCEPTED — implementation authorized.** The architecture authority approved the secure verification-token delivery hand-off on 2026-07-13. This ADR is implemented as the secure foundation only; SMTP and workers remain out of scope.

## Established constraints

- The verification database record stores only an Argon2 hash.
- Ordinary outbox payloads contain only IDs and correlation IDs.
- Audit events, logs, traces, exceptions, and public responses must not contain a plaintext token or secret.
- An Argon2 hash cannot be used to reconstruct the token needed by a delivery worker.

## Approved decision

The complete opaque token is encrypted with AES-256-GCM during the same database transaction that creates its Argon2 verification hash and outbox event. A fresh random 96-bit nonce and authentication tag are stored separately. The associated data is the canonical tuple of verification ID, organization ID, user ID, and correlation ID.

`VERIFICATION_ENCRYPTION_KEY` is a canonical base64-encoded 32-byte key and `VERIFICATION_KEY_VERSION` is mandatory startup configuration. Code obtains both through `ConfigModule`; neither is persisted in PostgreSQL. Only the restricted `VerificationDeliveryEnvelope` contains ciphertext, nonce, tag, and AAD. Ordinary outbox events contain the four IDs only.

An authorised future worker will load by verification ID, decrypt only with the same binding, deliver, and destroy the envelope. Envelopes are destroyed when a verification is revoked, expires, is exhausted, or is successfully confirmed. Resend revokes and destroys the preceding envelope in the same transaction before a replacement is created. The worker contract is defined but no worker is implemented.

## Current behavior

The application stores only the Argon2 hash in `Verification`. The recoverable opaque token exists transiently during the transaction and then only as AES-GCM ciphertext in `VerificationDeliveryEnvelope`. No token, ciphertext, nonce, tag, key, or AAD is logged, audited, returned, or placed in an ordinary outbox payload.
