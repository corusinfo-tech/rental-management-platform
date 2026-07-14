# G2.2C — Verification Delivery Closure Gate

## Result

**SUPERSEDED.** The architecture authority subsequently approved ADR-G2.2-001. See [ADR-G2.2-001](ADR_G2_2_VERIFICATION_TOKEN_DELIVERY_HANDOFF.md) and [the implementation report](ADR_G2_2_IMPLEMENTATION_REPORT.md).

## Handbook review

The approved Handbook was reviewed from the Google Document supplied by the project owner on 2026-07-13.

Applicable approved rules:

- Major engineering decisions require an ADR.
- BullMQ email queues, exponential retries, dead-letter handling, idempotent workers, and worker observability are approved.
- Passwords, tokens, secrets, and OTP values must never appear in logs or public API errors.

## Decision not authorized

The Handbook does not approve a secure hand-off of a recoverable verification token from the API transaction to a worker. In particular, it does not specify or authorize:

- a key-management or secret-manager boundary;
- a key owner, worker authorization model, rotation/versioning policy, or key retrieval contract;
- an authenticated-encryption algorithm and nonce/associated-data contract;
- a restricted encrypted delivery-envelope data model;
- envelope destruction/retention and committed-transaction recovery behaviour.

The exact missing decision is recorded in [ADR-G2.2-001](ADR_G2_2_VERIFICATION_TOKEN_DELIVERY_HANDOFF.md): **Secure verification-token delivery hand-off and key-management boundary**.

## Work deliberately not performed

- No encryption mechanism or delivery envelope was implemented.
- No SMTP or external email provider was implemented.
- No worker was granted access to plaintext verification material.
- No disposable PostgreSQL/Redis containers or delivery integration tests were started, because they would test an unapproved design rather than a permitted implementation.

## Current security posture

The existing verification flow stores only an Argon2 hash, and its ordinary outbox/audit data contains no plaintext verification token. This is safe against at-rest disclosure but cannot deliver an email token; it is not production-complete.

## Recommendation

**CONDITIONAL.** Accept ADR-G2.2-001 with the required cryptographic and operational controls. Only then implement the worker hand-off and run the specified PostgreSQL/Redis lifecycle, concurrency, retry, and ciphertext tests.
