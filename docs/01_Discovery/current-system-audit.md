# Current System Audit

**Audit date:** 2026-07-12  
**Scope:** Repository contents only. No application code, configuration, or runtime state was modified.  
**Method:** Static inspection of tracked/untracked workspace files. The audit was not executed locally because Node.js and pnpm are unavailable in the audit environment.

## Executive summary

This repository is an early-stage TypeScript monorepo for a rental-management SaaS. It is **not** a FastAPI/Python backend: the API is NestJS 11 on Node.js, backed by Prisma 6 and PostgreSQL. The Next.js 15 web app and Flutter mobile app are both minimal presentation shells.

Only authentication, rental agreement creation/status changes, manual invoice generation, and a health endpoint are implemented as API controllers. The database schema sketches a wider product model, but migrations do not exist and most documented bounded contexts do not have source modules or endpoints. The codebase is not ready for production use: most notably, public registration permits a caller to create an `ADMIN` user, tenant/object authorization is incomplete, no background job worker exists, and reproducible builds/CI are not currently possible due to the absence of a lockfile.

## 1. Folder structure

```text
.
├── apps/
│   ├── api/                 NestJS API and Prisma schema
│   ├── web/                 Next.js App Router application
│   └── mobile/              Flutter starter application
├── packages/contracts/      Type-only TypeScript API contract package
├── docs/                    Deployment documentation; this audit
├── .github/workflows/       One CI workflow
├── docker-compose.yml       Local development services
└── docker-compose.production.yml
```

Observations:

- `apps/api/src` contains only `auth`, `agreements`, `invoices`, and shared `common` code. There are no source directories for users, properties, units, GST, templates, payments, maintenance, notifications, documents, reports, or subscriptions.
- `packages/contracts` exports only response and status types. It has no generated OpenAPI client or DTO contracts.
- `infra/` is referenced by `README.md` but does not exist.
- The repository has no commits; every existing project file is untracked. This means there is no auditable baseline, release history, or usable `git pull` deployment path.

## 2. Frontend architecture — Next.js

- Stack: Next.js `15.1.0`, React `19.0.0`, TypeScript, Tailwind CSS `3.4.16`.
- Routing: App Router only, with one route at `apps/web/app/page.tsx` and a root layout.
- Rendering: The dashboard is a server component by default and contains only static markup.
- Styling: Tailwind directives in `app/globals.css`; no design system, component library, or shared UI components.
- Deployment: `next.config.ts` enables `output: 'standalone'`; the web Dockerfile builds a standalone Node image.

The dashboard is not a functional dashboard. Its four metrics all render `—`; it makes no API request, has no authentication/session provider, loading/error states, routing, forms, API client, or role-aware UI. The “Generate invoice” button has no handler.

## 3. Backend architecture — actual implementation

The requested FastAPI/Python backend does not exist. The implemented backend is:

- NestJS 11 / TypeScript / Express adapter.
- Prisma ORM with PostgreSQL.
- Redis and BullMQ queue registration for invoice delivery.
- `nestjs-pino` logging and Swagger/OpenAPI setup.

Architecturally, it is a small modular monolith. `AppModule` imports `AuthModule`, `AgreementsModule`, and `InvoicesModule`; `DatabaseModule` provides a global Prisma service. Controllers call services directly, and services call Prisma directly. Despite architecture documentation referring to ports, repositories, application layers, and domain events, those abstractions are not implemented.

Global API behaviour:

- API prefix: `/api`.
- URI versioning default: `v1`; implemented routes are under `/api/v1`.
- Swagger UI: `/docs` (not `/api/v1/docs`).
- Success envelope: `{ success: true, data }`.
- Error envelope: `{ success: false, error: { code, message, traceId } }`.
- Validation: whitelist, reject unknown fields, and transform request DTOs.

## 4. Package versions and dependency graph

### Workspace tooling

| Component | Declared version |
|---|---:|
| Node (Docker base / CI) | 22 |
| pnpm | 9.15.0 |
| TypeScript | ^5.7.2 |
| Prettier | ^3.4.2 |

### API dependencies

NestJS packages are declared at `^11.0.x`; Prisma/client at `^6.1.0`; BullMQ `^5.34.2`; `argon2` `^0.41.1`; `helmet` `^8.0.0`; `nestjs-pino` `^4.2.0`; and class-validator `^0.14.1`.

### Web and mobile dependencies

Web uses Next `^15.1.0`, React/React DOM `^19.0.0`, Tailwind `^3.4.16`. Mobile uses Flutter SDK `^3.6.0`, Dio `^5.7.0`, flutter_secure_storage `^9.2.2`, Riverpod `^2.6.1`, and go_router `^14.6.2`.

### Dependency graph

```text
web ────────────────► contracts (TypeScript types only)
api ─► Prisma ──────► PostgreSQL
api ─► BullMQ ──────► Redis
api ─► JWT / argon2
web ─► Next.js standalone runtime
mobile ─► Flutter (not integrated with API)
```

All JavaScript versions use caret ranges, and there is no `pnpm-lock.yaml`. Therefore versions are not reproducible. The CI workflow invokes `pnpm install --frozen-lockfile`, which will fail without a lockfile.

## 5. Authentication and authorization

### Authentication

- `POST /api/v1/auth/register` creates a tenant and its first user in one database transaction.
- Passwords require 12 characters and are hashed with Argon2.
- `POST /api/v1/auth/login` authenticates by `tenantId`, email, and password.
- Access tokens are JWTs with a 15-minute expiry; refresh tokens have a 30-day expiry.
- Refresh tokens are Argon2-hashed and stored on the user record. Issuing a token replaces the prior stored refresh hash, allowing only one active refresh token per user.
- Tokens are returned in JSON response bodies; they are not stored in secure, HTTP-only cookies.

### Authorization

- Roles are `ADMIN`, `LANDLORD`, `TENANT`, and `AGENT`.
- A custom JWT guard validates access tokens.
- A metadata-based roles guard protects agreement and invoice endpoints.
- No global authentication guard exists; controllers must opt in individually.
- No permissions model, ownership policy, tenant database RLS, service-level policy abstraction, or tenant context middleware exists.

## 6. Existing APIs

| Method | Route | Authentication / roles | Implementation |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Static health payload; does not test PostgreSQL/Redis. |
| POST | `/api/v1/auth/register` | Public | Creates tenant/user and returns token pair. |
| POST | `/api/v1/auth/login` | Public | Issues token pair. |
| POST | `/api/v1/auth/refresh` | Public | Rotates token pair. |
| POST | `/api/v1/agreements` | ADMIN, LANDLORD, AGENT | Creates agreement. |
| PATCH | `/api/v1/agreements/:id/status` | ADMIN, LANDLORD, AGENT | Updates status and vacated/cancelled timestamp. |
| POST | `/api/v1/invoices/generate` | ADMIN, LANDLORD, AGENT | Creates issued invoice and queues delivery. |
| GET | `/docs` | Public | Swagger UI. |

There are no controllers for user management, properties, units, GST profiles, templates, payments, maintenance, notifications, documents, reports, subscriptions, or invoice retrieval.

## 7. Database models and migrations

`apps/api/prisma/schema.prisma` declares PostgreSQL models for `Tenant`, `User`, `Property`, `Unit`, `RentalAgreement`, `GstProfile`, `InvoiceTemplate`, `Invoice`, `Payment`, `MaintenanceRequest`, `Document`, `Notification`, and `AuditLog`.

Strengths:

- Tenant identifiers and several tenant-leading indexes exist.
- Composite uniqueness exists for tenant email, GSTIN, template name, invoice number, and agreement/billing period.
- Invoice monetary fields use `Decimal` database types.
- Invoice snapshot and audit-log metadata use JSON.

Gaps:

- There is no `apps/api/prisma/migrations` directory and no committed migration history.
- The schema omits foreign-key relations for several identifiers, including agreement `landlordId`, `tenantUserId`, maintenance `unitId`/`raisedBy`, notification `userId`, and document owners.
- The direct `tenantId` on `Unit` is not constrained to match its property's tenant.
- There are no database-level row-level security policies or tenant enforcement triggers.
- No schema fields support invoice line items, GST CGST/SGST/IGST breakdown, payment gateway event/idempotency records, subscription state, document retention, soft deletion, or optimistic concurrency/versioning.

## 8. Invoice and payment implementation

### Invoices

Manual invoice generation is the only invoice endpoint. It finds an agreement by `(id, tenantId)`, requires an `ACTIVE` agreement without `vacatedAt`/`cancelledAt`, calculates GST from agreement rent and GST rate, creates an `ISSUED` invoice in a transaction, writes an audit row, and enqueues `deliver-invoice`.

The scheduler class queries auto-enabled active agreements and invokes the same generation path. It is not connected to a cron schedule, repeatable BullMQ job, or application lifecycle event. It is therefore dead/unreachable in normal execution. It also has no billing-date rule and would attempt invoice generation for every eligible agreement whenever invoked; uniqueness prevents duplicate periods but resulting constraint errors are not handled as idempotent outcomes.

There is no GST profile/template lookup, PDF rendering, invoice line-item model, invoice delivery worker, delivery provider, invoice list/read/void endpoints, payment reconciliation, overdue processing, or credit note functionality.

### Payments

Only a Prisma `Payment` model exists. There are no payment controllers, services, webhooks, providers, callbacks, reconciliation jobs, or UI. Payment functionality is not implemented.

## 9. Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | Prisma / API validation | Required at startup. |
| `REDIS_URL` | BullMQ | Has a localhost default in code. |
| `JWT_ACCESS_SECRET` | API validation/JWT | Required at startup. |
| `JWT_REFRESH_SECRET` | API validation/JWT | Required at startup. |
| `WEB_ORIGIN` | CORS | Comma-separated allowed origins. |
| `SMTP_URL` | Templates only | No email implementation consumes it. |
| `NODE_ENV` | Logger/Docker | Controls pretty logging. |
| `LOG_LEVEL` | Logger | Optional. |
| `PORT` | API bootstrap | Defaults to 3001. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Production Compose PostgreSQL | Compose interpolation; password required. |
| `NEXT_PUBLIC_API_URL` | Local web Compose only | Not consumed by frontend source and is supplied at runtime although Next public variables are build-time values. |

## 10. Build, test, and deployment

### Build and test

- Root scripts execute workspace `dev`, `build`, `lint`, `test`, and formatting commands.
- API uses `nest build`; web uses `next build`; mobile has no root build script.
- No test files, Jest configuration, ESLint configuration, Playwright/Cypress setup, or Flutter tests are present.
- The API test script will not provide meaningful validation; the CI pipeline is additionally blocked by the missing lockfile.

### Deployment

- Local Compose exposes PostgreSQL 5432, Redis 6379, MailHog 1025/8025, API 3001, and web 3000.
- Production Compose keeps PostgreSQL and Redis internal and binds API/web to loopback. It has persistent named volumes and restart policies.
- Virtualmin documentation recommends Apache reverse proxying to localhost API/web containers.
- API and web Dockerfiles use multi-stage builds. The source documents a required initial migration but none is included.

Operational documentation is inconsistent with the production compose file: the guide omits `--env-file .env.production`, even though Compose requires `POSTGRES_PASSWORD` during interpolation. The guide also specifies host ports 3000/3001, while the deployed VPS was changed separately to 3100/3101; that deployment change is not represented in the repository.

## 11. Security findings

| Severity | Finding | Evidence / impact |
|---|---|---|
| Critical | Public self-registration accepts any role, including `ADMIN`. | `RegisterDto.role` is client-controlled and `/auth/register` is public. Any internet user can create an administrator for a new tenant. |
| High | Tenant and object authorization is incomplete. | Agreement creation accepts `landlordId` and `unitId` without verifying that they belong to the current tenant or authorized actor. Cross-tenant/cross-owner references may be created. |
| High | No committed migrations. | Production database state cannot be provisioned or upgraded reproducibly. `db push` is not a production migration strategy. |
| High | Invoice delivery queue has no processor. | Jobs are queued but never sent; operational state can falsely imply delivery occurred. |
| Medium | Refresh token handling has no logout/revocation/session device model. | A refresh token is returned in JSON; there is one stored hash and no explicit revocation endpoint, token reuse detection, or cookie protection. |
| Medium | Rate limiting is not enforced. | `ThrottlerModule` is configured but `ThrottlerGuard` is not registered globally or applied to routes. Login and registration can be brute-forced. |
| Medium | No `.dockerignore` exists. | Docker build context can include local `.env` files, source artefacts, and other unintended files. |
| Medium | Development Compose uses public default database credentials and exposes PostgreSQL/Redis. | Safe only for isolated development hosts; it is unsafe for a public VPS. |
| Medium | The previous `api.noagent4u.com` vhost served an unrelated Django debug page. | This was observed in deployment feedback. It indicates the API host was routed to another application and publicly exposed debug information. |
| Low | Error trace IDs are not generated. | The exception filter reads `x-request-id` but no middleware assigns one. |
| Low | Swagger is publicly available without an environment policy. | API contracts and schemas may be exposed unintentionally. |
| Low | Security architecture claims exceed implementation. | RLS, outbox events, object storage port, cache-aside logic, and clean architecture ports are documented but absent. |

## 12. Performance and reliability findings

- No cache-aside implementation exists despite Redis being present.
- No pagination, filtering, query limits, response caching, or database connection pooling settings are visible.
- Invoice number generation uses a UUID suffix, avoiding a simple count race, but no legal/tenant numbering strategy or idempotency key exists.
- The scheduler can fan out all eligible agreements with `Promise.allSettled`, without batching, locking, observability, or a scheduling trigger.
- The health endpoint checks neither database nor Redis readiness.
- No API/web container health checks are defined in production Compose.
- No backups, restore tests, metrics, tracing, alerts, SLOs, log retention, or job-monitoring dashboard are configured.
- The database schema has useful tenant indexes, but foreign-key and workload-specific indexes remain incomplete.

## 13. Dead code and unused declarations

- `InvoiceScheduler` is injectable but never called or scheduled.
- `SMTP_URL` is documented but unused by source code.
- `ioredis`, `joi`, `class-transformer`, and several Nest development dependencies are not directly referenced in application source. Some may be transitive/framework requirements, but they are not used explicitly.
- `NEXT_PUBLIC_API_URL` is set in local Compose but not read by the Next.js app.
- The mobile dependencies are not exercised beyond a static `main.dart` dashboard.
- `enableShutdownHooks` is defined on `PrismaService` but never called.
- `packages/contracts` is listed as a web dependency but no exported contract is imported in web source.
- `infra/` is referenced in `README.md` but is absent.

## 14. Documentation gaps

Existing `README.md`, `ARCHITECTURE.md`, and Virtualmin deployment guidance explain intended architecture and deployment shape, but they do not match implementation completeness.

Missing or incomplete documentation includes:

- API endpoint reference with request/response examples and role/tenant rules.
- Database ERD, migration strategy, data retention, backup/restore, and tenancy/RLS policy.
- Authentication lifecycle: initial tenant creation, role assignment, logout, token storage, rotation, and account recovery.
- Invoice legal/GST requirements, numbering, template/PDF behaviour, delivery channels, retries, and payment lifecycle.
- Queue topology, worker deployment, failure/retry policy, and observability.
- Local developer prerequisites, setup steps, lockfile policy, test strategy, code style, and contribution workflow.
- Production runbook: secrets management, migration rollout/rollback, port/vhost mapping, monitoring, incident response, and disaster recovery.
- Mobile release/build instructions.
- A clear implementation-status matrix separating planned bounded contexts from implemented ones.

## Prioritized remediation backlog

1. Block public privileged role selection; define a secure tenant bootstrap and invite/role-assignment flow.
2. Implement service-level tenant/object authorization and database FK/RLS safeguards.
3. Create, review, commit, and deploy Prisma migrations; establish a migration-only production release process.
4. Add a lockfile, dependency update policy, test suites, lint configuration, and a passing CI baseline.
5. Implement or remove the invoice delivery queue; add a worker, provider adapters, delivery status, retries, and monitoring.
6. Make API/web Docker runtime and Virtualmin proxy configuration reproducible in the repository, including the actual port mapping and `--env-file` commands.
7. Implement real dashboard/API integration and an authenticated session model before exposing the frontend to users.
8. Complete the promised bounded contexts incrementally, with endpoint authorization, DTOs, repositories, tests, and documentation per context.
9. Add health/readiness checks, metrics, structured request IDs, audit correlation, backups, and alerting.
10. Remove unused dependencies/dead code or implement the claimed capabilities.
