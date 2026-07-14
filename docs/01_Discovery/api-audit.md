# NoAgent4U NestJS API Audit

**Audit date:** 2026-07-13  
**Scope:** Static review of `apps/api`. No source code, configuration, database, or runtime state was modified.

## 1. Executive Summary

The NoAgent4U API is a NestJS 11 modular-monolith scaffold with three implemented business modules: authentication, rental agreements, and invoice generation. It uses Prisma/PostgreSQL, JWTs, role metadata guards, DTO validation, Swagger UI, Pino logging, Helmet, and a consistent response envelope.

The implemented surface is small: seven API endpoints plus Swagger. It does not yet deliver the modules described in the platform architecture (users, properties, units, GST profiles, templates, payments, maintenance, notifications, documents, reports, and subscriptions). There are no list/read/update/delete endpoints beyond agreement status updates, no pagination/filtering convention, no file uploads, and no response DTOs.

The most important API risk is authorization: authentication is route-specific rather than globally enforced, public registration accepts a caller-provided role including `ADMIN`, and service methods do not consistently prove object ownership/tenant membership for referenced IDs.

## 2. API Modules

| Module / component | Contents | API role | Status |
|---|---|---|---|
| `AppModule` | Config, logging, throttler config, database, auth, agreements, invoices | API composition root | Implemented; configuration is compact and lacks a typed schema. |
| `DatabaseModule` | Global `PrismaService` | PostgreSQL connection provider | Implemented. |
| `AuthModule` | Controller, service, JWT guard, roles guard exports | Tenant registration, login, refresh tokens | Implemented but security controls are incomplete. |
| `AgreementsModule` | Agreement controller/service/DTOs | Create agreement; change status | Implemented as a minimal write-only API. |
| `InvoicesModule` | Invoice controller/service/scheduler | Manual invoice issue and BullMQ enqueue | Partly implemented; delivery worker and scheduler trigger are absent. |
| Common components | decorators, roles guard, current-user decorator, validation/error/response utilities | Cross-cutting API behaviour | Implemented with notable gaps described below. |
| Health controller | Public health route | Process liveness response | Implemented; does not verify dependencies. |

The repository contains no Nest modules/controllers for User Management, Properties, Units, GST Profiles, Invoice Templates, Payments, Maintenance Requests, Notifications, Document Management, Reports, or Subscription Billing.

## 3. Endpoint Inventory

### API conventions used by every implemented controller

- Global prefix: `/api`.
- URI versioning: routes use default version `v1`, producing `/api/v1/...`.
- Success body: global response interceptor wraps successful return values as `{ "success": true, "data": <value> }`.
- Error body: global exception filter wraps errors as `{ "success": false, "error": { "code", "message", "traceId" } }`.
- Global validation: whitelist enabled, unknown fields rejected, transforms enabled.
- Swagger UI: `/docs`, not versioned under `/api/v1`.

### Endpoint matrix

| Method | Route | Controller | Service | Authentication required | Authorization required | Request DTO | Response DTO | Validation | Swagger coverage |
|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/v1/health` | `HealthController.check` | None | No | No | None | None; returns `{ status: 'ok', service: 'rentalos-api' }`, then global envelope | None | No tags, operation, response, or health schema annotations. It may appear as an ungrouped route. |
| POST | `/api/v1/auth/register` | `AuthController.register` | `AuthService.register` | No | No | `RegisterDto` | None; token object inferred at runtime then global envelope | `tenantName`: string/min 2; `email`: email; `password`: string/min 12; first/last name string; `role`: `IsEnum(Role)` | `Authentication` tag; properties only partly described through `ApiProperty`; no operation/response schema. |
| POST | `/api/v1/auth/login` | `AuthController.login` | `AuthService.login` | No | No | `LoginDto` | None; token object inferred at runtime then global envelope | Email, password string, tenantId string (not UUID constrained) | `Authentication` tag only; no DTO property decorators, operation, response, or error documentation. |
| POST | `/api/v1/auth/refresh` | `AuthController.refresh` | `AuthService.refresh` | No | No | `RefreshDto` | None; token object inferred at runtime then global envelope | `refreshToken`: string | `Authentication` tag only; no operation/response/error documentation. |
| POST | `/api/v1/agreements` | `AgreementsController.create` | `AgreementsService.create` | Yes — Bearer JWT | `ADMIN`, `LANDLORD`, or `AGENT` via roles guard | `CreateAgreementDto` | None; raw Prisma agreement model, global envelope | UUID unit/landlord/optional tenant user; decimal strings for rent/GST; ISO dates; optional boolean; no business/date-range or ownership validation | `Rental Agreements` tag and bearer-security scheme; no request-body/response/error documentation. |
| PATCH | `/api/v1/agreements/:id/status` | `AgreementsController.status` | `AgreementsService.updateStatus` | Yes — Bearer JWT | `ADMIN`, `LANDLORD`, or `AGENT` | `UpdateAgreementStatusDto` plus unvalidated string path `id` | None; raw Prisma agreement model, global envelope | `status` is only `IsString`, despite TypeScript enum type; `id` has no UUID validation | `Rental Agreements` tag and bearer-security scheme; no parameter/request-body/response/error documentation. |
| POST | `/api/v1/invoices/generate` | `InvoiceController.generate` | `InvoiceService.generateManual` | Yes — Bearer JWT | `ADMIN`, `LANDLORD`, or `AGENT` | `GenerateInvoiceDto` | None; raw Prisma invoice model, global envelope | UUID agreement; issue/due ISO dates; no rule that due date follows issue date; no idempotency key | `Invoice Generation` tag and bearer-security scheme; no request/response/error documentation. |
| GET | `/docs` | Swagger setup in `main.ts` | None | No | N/A | Swagger UI HTML | N/A | OpenAPI UI is public; only tag/bearer annotations noted above. |

### Response DTO assessment

No endpoint has an explicit response DTO. Controllers return service/Prisma objects directly. Swagger therefore cannot reliably document response schemas, global envelopes, dates/decimals, token payloads, or error bodies. Returning raw Prisma models also couples external API responses to persistence models.

## 4. Authentication Flow

### Registration

1. Public caller sends `tenantName`, identity fields, password, and a role.
2. API checks whether any existing user has the same email, regardless of tenant.
3. Argon2 hashes the password.
4. A transaction creates a tenant and its user.
5. API signs a 15-minute access JWT and 30-day refresh JWT.
6. API hashes and stores the refresh token in `User.refreshTokenHash`.
7. Both plain tokens are returned in the JSON response.

### Login

1. Caller supplies `tenantId`, email, and password.
2. API finds user by the composite `(tenantId, email)` unique key.
3. API verifies Argon2 password and `isActive`.
4. It issues a new token pair and replaces the stored refresh-token hash.

### Refresh

1. Caller supplies a refresh token in request JSON.
2. API verifies signature/expiry with `JWT_REFRESH_SECRET`.
3. API finds the user and verifies the token against the stored Argon2 hash.
4. It issues a replacement pair and overwrites the old refresh hash.

### Authentication strengths

- Passwords are Argon2 hashed.
- Access tokens are short lived.
- Refresh tokens are hashed at rest.
- Access/refresh secrets are separately configured.
- JWT claims carry `sub`, `tenantId`, `role`, and email.

### Authentication gaps

- Registration allows unauthenticated callers to select `ADMIN`, `LANDLORD`, `TENANT`, or `AGENT`.
- There is no logout/revoke endpoint, session/device table, token reuse detection, or per-device refresh token support.
- Tokens are returned in JSON; web storage/cookie policy is not implemented.
- JWT options omit issuer, audience, clock tolerance, key IDs, and rotation strategy.
- Login `tenantId` is a free-form string, not UUID validated.
- There is no password reset, email verification, MFA, account lockout, invite flow, or user activation/deactivation endpoint.
- The configured throttler is not actually enforced by a `ThrottlerGuard`, leaving public login/registration unprotected from brute force.

## 5. Authorization Review

### Current model

- `JwtAuthGuard` parses a Bearer token and validates it with `JWT_ACCESS_SECRET`.
- `RolesGuard` reads a `Roles(...)` metadata decorator and checks `request.user.role`.
- Agreement and invoice controllers apply both guards at controller level.
- Allowed roles are broad: `ADMIN`, `LANDLORD`, and `AGENT` may create agreements, alter status, and issue invoices.

### Findings

| Finding | Impact |
|---|---|
| No global default-authentication policy | A future controller can accidentally be public if guards are omitted. |
| Role-only RBAC; no permission or ownership policy | A role does not prove the actor owns or manages the referenced record. |
| Agreement creation trusts body `unitId`, `landlordId`, and `tenantUserId` | No service check proves these records are in the caller tenant or that actor may assign them. |
| `Unit`/agreement foreign relationships are incomplete in schema | Cross-tenant reference integrity cannot be relied on at database level. |
| Invoice generation scopes agreement lookup by `tenantId` | This endpoint has a basic tenant isolation check, but not actor-to-agreement ownership/management verification. |
| Public self-registration selects role | Any caller can bootstrap a privileged tenant administrator. This is a critical business authorization concern. |
| Tenant users have no protected tenant-facing endpoints | Tenant role is defined but no implemented API uses it. |

### Recommendation

Adopt deny-by-default global authentication with explicit `@Public()` routes; introduce policy/permission checks in services; derive landlord/tenant identities from the authenticated principal rather than trusting request bodies; and add relational constraints/RLS as defence in depth.

## 6. API Standards

### Implemented standards

- `/api/v1` URI versioning.
- JSON response envelopes for normal and exceptional paths.
- Class-validator DTO input filtering and rejection of unknown properties.
- Swagger setup with a Bearer security scheme.
- Helmet security headers and a configurable CORS origin list.
- Pino HTTP logging with redaction of authorization, password, and refresh-token fields.

### Gaps and inconsistencies

- No explicit response DTOs or serialization policy.
- No API naming/lifecycle/deprecation policy.
- No correlation-ID middleware. The error filter reads `x-request-id` but never generates one.
- `traceId` may be absent; error response contract does not match README claim of `details` field.
- No idempotency-key standard for non-idempotent POSTs, especially invoice issuance/payment webhooks.
- No pagination/filtering/sorting/query parameter conventions.
- No API date/time, decimal, currency, locale, or GST serialization standard.
- Swagger annotations are incomplete and no OpenAPI artifact is checked in/validated in CI.
- No API test suite validates the envelope, security, or compatibility contract.

## 7. Error Handling

### Current implementation

`HttpExceptionFilter` catches all exceptions. For Nest `HttpException` values it preserves the HTTP status and derives `message` from the exception response. For other exceptions it returns HTTP 500 and `Internal server error`. Every error body is wrapped as:

```json
{
  "success": false,
  "error": {
    "code": "HTTP_<status>",
    "message": "...",
    "traceId": "<x-request-id header if supplied>"
  }
}
```

### Findings

- Validation errors can return `message` as an array while other errors use strings; clients need a union type.
- Error code is only HTTP-status-derived, not a stable domain/application code.
- No `details`, field-error shape, internal error ID, retryability flag, or documentation exists.
- Unknown exceptions are not visibly logged by this filter; operational diagnosis may be limited.
- Prisma unique/foreign-key errors are not translated into stable conflict/validation errors.
- No mapping exists for BullMQ, Redis, PostgreSQL, JWT, or third-party provider failures.

### Recommendation

Define a versioned API error taxonomy with stable codes and field details; generate a request ID; log unhandled exceptions with that ID; and map known Prisma/queue/auth failures to appropriate HTTP/domain errors.

## 8. Pagination Strategy

There is no pagination strategy because the API exposes no collection/list endpoints.

Recommended standard for future collection endpoints:

- Use cursor pagination for large/mutable operational collections (`cursor`, `limit`, optional direction), with a default limit and a hard maximum.
- Return page metadata consistently, for example `{ nextCursor, hasMore }` inside the existing success envelope.
- Use deterministic, indexed sort keys (for example, `createdAt` plus `id`).
- Use offset pagination only for small, administrative, stable result sets where count is required.
- Document defaults, maxima, sorting, and tenant scoping in Swagger.

## 9. Filtering Strategy

There is no filtering, sorting, or search strategy because no list endpoints exist.

Recommended standard:

- Whitelist typed query DTOs; reject unknown query parameters.
- Use named filters such as `status`, `propertyId`, `unitId`, `from`, `to`, and `q`; do not pass raw ORM where clauses from clients.
- Apply tenant scope and authorization before business filters.
- Explicitly whitelist sortable columns and sort directions.
- Add database indexes only after listing/search workload is known and tested.

## 10. File Upload Endpoints

No file upload endpoint exists.

There is a `Document` Prisma model but no controller, service, storage provider, multipart handling, signed URL flow, file metadata validation, malware scan, authorization check, retention policy, or download endpoint. Do not expose document upload until these controls are designed.

## 11. Public APIs

| Public route | Intended role | Audit concern |
|---|---|---|
| `GET /api/v1/health` | Liveness check | Does not test PostgreSQL/Redis readiness; public availability is acceptable if response stays minimal. |
| `POST /api/v1/auth/register` | Tenant bootstrap | Critical: caller-controlled role allows privileged account creation. |
| `POST /api/v1/auth/login` | Authentication | Needs active rate limiting, account lockout and observability. |
| `POST /api/v1/auth/refresh` | Session renewal | Needs cookie/session/revocation strategy and rate limiting. |
| `GET /docs` | Swagger UI | Public API metadata; make availability an explicit environment policy. |

## 12. Admin APIs

There are no ADMIN-exclusive endpoints. `ADMIN` shares the following routes with `LANDLORD` and `AGENT`:

- `POST /api/v1/agreements`
- `PATCH /api/v1/agreements/:id/status`
- `POST /api/v1/invoices/generate`

There are no APIs for tenant administration, user roles, user activation, properties/units, GST settings, templates, audit viewing, reports, subscription state, or operational configuration.

## 13. Missing APIs

### Authentication and tenant administration

- Logout/revoke sessions, password reset/change, email verification, account lockout, MFA.
- Invite user, accept invite, user profile/read/update, role assignment/removal, activation/deactivation.
- Tenant profile/settings and membership management.

### Rental operations

- Properties and units: CRUD, availability, assignment, search/list/detail.
- Agreements: list/detail/update/delete/draft/activation, tenant/landlord/unit validations, vacate/cancel workflows.
- GST profiles and invoice templates: CRUD, default selection, validation.
- Invoices: list/detail/PDF/download/void/resend/reminder/overdue and credit notes.
- Payments: initiation, records/list/detail, gateway webhooks, reconciliation, refunds, receipts, idempotency.
- Maintenance: create/list/detail/update/assign/attachments/comments/status lifecycle.
- Notifications: preferences, templates, send history, retry/failure status.
- Documents: upload/download/list/delete/access-controlled signed URL flow.
- Reports and exports.
- Subscription billing, plans, entitlement checks, provider webhooks.

### Platform/operational APIs

- Readiness/health dependencies, metrics, audit-log retrieval for authorized administrators, API version metadata, and operational queue status.

## 14. Inconsistent APIs

| Inconsistency | Evidence | Recommendation |
|---|---|---|
| Documented architecture vs API surface | Architecture names many bounded contexts; API implements three business modules | Publish an implementation-status matrix and add APIs incrementally. |
| README error format vs implementation | README claims `details`; exception filter does not return it | Define and document one actual error schema. |
| Swagger coverage | Tags/bearer decoration exist, but responses/operations/DTOs are largely undocumented | Add complete Swagger decorators and response/error schemas. |
| Input validation depth | Register DTO is more documented than login; agreement status is string instead of enum; path IDs lack UUID validation | Standardize DTO annotations and business validation. |
| API response models | Raw Prisma entities returned by services | Introduce response DTOs/mappers to prevent persistence contract leakage. |
| Invoice notifications | Invoice endpoint queues email/push/WhatsApp delivery but no processor/provider exists | Do not claim delivery until worker/status model exists. |
| Scheduler | Scheduler class exists but no trigger/cron/repeat job calls it | Implement an explicit scheduler/worker or remove unreachable code. |
| Throttling | Module config exists but no guard enforces it | Register/test the guard or remove configuration. |

## 15. Recommendations

### Critical before public API use

1. Remove public caller-controlled privileged role creation; implement a secure tenant-bootstrap/admin invite flow.
2. Enforce authentication globally by default and use explicit public-route metadata.
3. Add service-level ownership and tenant checks for every body/path/query identifier; add relational constraints and consider PostgreSQL RLS.
4. Register and test rate limiting on auth/public endpoints.
5. Create Prisma migrations and integration tests before using the API against production data.

### API contract foundation

1. Add request and response DTOs for every route, including an explicit token payload and consistent success/error envelopes.
2. Complete Swagger operation, request, response, parameter, error, and security documentation; export/validate OpenAPI in CI.
3. Establish pagination, filtering, sorting, date/time, decimal/currency, idempotency, and deprecation standards before implementing list/payment endpoints.
4. Add stable application error codes, field errors, Prisma mappings, request IDs, and exception logging.
5. Add endpoint/unit/integration tests covering validation, role/tenant isolation, invoice idempotency, and error envelopes.

### Product API completion

1. Implement properties/units and complete agreement lifecycle before broad invoice/payment work.
2. Implement GST profile/template/line-item/PDF requirements before calling invoices GST-compliant.
3. Build a BullMQ worker plus email/push/WhatsApp provider adapters and delivery status before enabling invoice notification claims.
4. Implement payment gateway/webhook/idempotency/reconciliation architecture before exposing payments.
5. Design document upload/download around object storage, signed URLs, scan, quota, and authorization rather than direct API file persistence.

## Evidence sources

- `apps/api/src/**`, `apps/api/prisma/schema.prisma`, `apps/api/package.json`, and API bootstrap/configuration files.
- This is a static code audit; no API request, Swagger UI, database, queue, or test suite was executed.
