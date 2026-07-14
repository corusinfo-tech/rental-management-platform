# Public Registration Business Rules

## Tenant

A tenant registration creates a `Person`, a `User` in `PENDING_EMAIL`, an email-verification record, an audit event, and `UserRegistered`/`VerificationRequested` outbox events. It creates **no Organization, OrganizationMembership, or role assignment**. A tenant receives organization membership only through a landlord invitation or lease assignment.

## Landlord

A landlord registration creates one Organization, Person, User in `PENDING_REVIEW`, active owner membership, and the standard `LANDLORD` membership role. The membership has `isOwner = true`; the database permits only one active owner membership for an organization. It also creates an email-verification record, audit event, and the two outbox events.

## Public response and abuse controls

Both newly accepted and duplicate registration requests return the same `202` response body: `{ success: true, data: { accepted: true }, meta }`. Duplicate users are never recreated. Redis enforces IP and HMAC-fingerprinted identifier limits; throttled attempts produce an audit event containing fingerprints only.

Names are trimmed, non-empty, 1–100 characters, and may not contain Unicode control characters. Email is trimmed/lower-cased. Mobile punctuation is removed and the final value must be E.164.

## Email verification lifecycle

Verification requests are existence-neutral and cooldown-neutral. A pending request stores only an Argon2 secret hash, expiry, attempt count, and audit state. Successful verification is single-use and emits `EmailVerified`; replay, expiry, and attempt-limit outcomes are audited. Tenant users transition from `PENDING_EMAIL` to `ACTIVE`; landlord users remain `PENDING_REVIEW` after email verification pending manual review.
