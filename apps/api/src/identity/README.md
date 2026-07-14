# Identity public registration

`POST /api/v1/auth/register` is the sole active public identity endpoint. It returns an idempotent `202` acceptance envelope and never issues a session or token.

The controller validates a normalized DTO, applies Redis-backed registration throttling using the reverse-proxy-aware request IP and HMAC fingerprints, then delegates the database workflow to `PublicRegistrationService`. The service owns a single Prisma transaction. It persists Person/User/verification/audit data and transactional outbox events; it does not deliver email, WhatsApp, OTPs, or create authentication sessions.

Tenant registration does not create an organization or membership. Landlord registration creates one organization and one active owner membership with the `LANDLORD` role. See `docs/BUSINESS_RULES/PUBLIC_REGISTRATION.md` for the approved policy.

Email verification is a separate lifecycle at `/api/v1/auth/email-verification/request` and `/confirm`. Both endpoints return generic envelopes. `Verification` stores only an Argon2 hash. In the same transaction, the opaque token is AES-256-GCM encrypted into `VerificationDeliveryEnvelope`, using AAD bound to verification, organization, user, and correlation identifiers. The encryption key and required version are obtained only through `ConfigModule`; neither is stored in PostgreSQL.

## Verification engine

`VerificationEngine` is the channel-independent owner of creation, resend, validation, expiry, consumption, revocation, envelope creation, outbox publication, and audit events. It supports the `EMAIL_VERIFICATION`, `SMS_OTP`, `WHATSAPP_OTP`, `PASSWORD_RESET`, `MAGIC_LOGIN`, `INVITATION`, and `MFA` purpose vocabulary. Email is the sole working channel. SMS, WhatsApp, password-reset, magic-link, and invitation channel classes are deliberate provider-free stubs.

```text
Channel → VerificationEngine → VerificationDeliveryEnvelope → ID-only Outbox → future worker
```

`VerificationRequested` outbox payloads contain only `verificationId`, `organizationId`, `userId`, and `correlationId`. A future authorized worker will load the envelope by verification ID, decrypt it with the identical AAD, deliver it, and destroy its encrypted material. Resend, expiry, revocation, attempt exhaustion, and successful confirmation destroy the envelope. No delivery worker or provider is implemented in this story.
