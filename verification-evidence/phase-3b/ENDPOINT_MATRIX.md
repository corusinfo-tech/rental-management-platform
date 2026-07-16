# Phase 3B Production Endpoint Matrix

Observed at `https://noagent4u.com` on 2026-07-17 (Asia/Kolkata). Requests used invalid or empty test payloads so they could prove routing, validation, and guards without creating identities or changing account data.

| Request | Result | Evidence |
|---|---:|---|
| `POST /api/auth/login` | 404 | NestJS JSON: `Cannot POST /api/auth/login`; correlation `5afa4809-ab9d-48ec-8938-833d505bcf23` |
| `POST /auth-api/login` | 404 | Next.js HTML 404; deployed BFF route absent |
| `POST /api/v1/auth/login` with invalid credentials | 401 | Generic `Invalid credentials`; correlation `db37a3b5-e740-4cf0-afec-01e317557104` |
| `POST /api/v1/auth/register` with `{}` | 400 | Registration DTO validation envelope |
| `POST /api/v1/auth/email-verification/request` with `{}` | 400 | Email validation envelope |
| `POST /api/v1/auth/email-verification/confirm` with `{}` | 400 | Token validation envelope |
| `POST /api/v1/auth/refresh` with `{}` | 400 | Refresh-token validation envelope |
| `POST /api/v1/auth/logout` without bearer | 401 | `Bearer token is required` |
| `POST /api/v1/auth/logout-all` without bearer | 401 | `Bearer token is required` |
| `GET /api/v1/auth/sessions` without bearer | 401 | `Bearer token is required` |
| `DELETE /api/v1/auth/sessions/{uuid}` without bearer | 401 | `Bearer token is required` |
| `POST /api/v1/auth/password-reset/request` with `{}` | 400 | Identifier validation envelope |
| `POST /api/v1/auth/password-reset/confirm` with `{}` | 400 | Token and password validation envelope |
| SMS and WhatsApp request/confirm with `{}` | 400 | DTO validation envelopes |
| `GET /health` | 404 | Next.js HTML 404; public proxy does not route API health |
| `HEAD /docs` | 404 | Next.js HTML 404; public proxy does not route Swagger |

## Deployed page routes

| Route | HTTP |
|---|---:|
| `/login` | 200 |
| `/dashboard` | 200 (old placeholder build) |
| `/register` | 404 |
| `/verify-email` | 404 |
| `/forgot-password` | 404 |
| `/reset-password` | 404 |
| `/properties` | 404 |
| `/leases` | 404 |
| `/invoices` | 404 |
| `/payments` | 404 |
| `/settings` | 404 |
| `/auth-api/login` | 404 |
| `/platform-api/v1/organizations` | 404 |

## Commands

```bash
curl -i -X POST https://noagent4u.com/api/auth/login \
  -H 'content-type: application/json' \
  --data '{"identifier":"phase3b-probe@example.invalid","password":"invalid-password-123","rememberMe":false}'

curl -i -X POST https://noagent4u.com/auth-api/login \
  -H 'content-type: application/json' \
  --data '{"identifier":"phase3b-probe@example.invalid","password":"invalid-password-123","rememberMe":false}'

curl -i -X POST https://noagent4u.com/api/v1/auth/login \
  -H 'content-type: application/json' \
  --data '{"identifier":"phase3b-probe@example.invalid","password":"invalid-password-123"}'
```
