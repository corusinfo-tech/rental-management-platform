# API public registration

## `POST /api/v1/auth/register`

Accepts tenant or landlord registration requests. The endpoint is rate limited using Redis, is reverse-proxy aware through `TRUST_PROXY_HOPS`, and accepts JSON bodies up to `REGISTRATION_BODY_LIMIT_BYTES`.

Successful and duplicate requests return HTTP `202` with the global envelope:

```json
{
  "success": true,
  "data": { "accepted": true },
  "meta": { "correlationId": "…", "requestId": "…" }
}
```

Validation (`400`), reserved integrity (`409`), and throttle (`429`) errors use the global error envelope documented in Swagger at `/docs`. The endpoint never returns a user ID, verification secret, password hash, session, or JWT.

## Email verification

`POST /api/v1/auth/email-verification/request` accepts `{ "email": "…" }` and always returns HTTP `202` with the generic accepted envelope, regardless of account state, verification state, or resend cooldown.

`POST /api/v1/auth/email-verification/confirm` accepts the opaque token from a future email link and always returns the generic envelope. A valid, unexpired, unused token updates the verification record and user status, then publishes an ID-only `EmailVerified` outbox event. Invalid, expired, replayed, and attempt-limited tokens reveal no additional state.
