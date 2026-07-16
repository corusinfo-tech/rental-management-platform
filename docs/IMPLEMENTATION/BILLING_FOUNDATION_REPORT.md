# Billing & Rent Schedule Foundation Report

## Scope

This sprint adds lease billing configuration and rent-planning schedules. It does **not** create invoices, payments, accounting entries, GST, receipts, notifications, or communication workflows.

## Database

The additive migration is `20260716130000_billing_rent_schedule_foundation`.

New entities:

- `LeaseBillingCalendar` — one billing configuration per lease, including cycle, due-date policy, proration method, lifecycle status, and schedule-generation watermark.
- `LeaseRentSchedule` — generated rent-planning periods and due dates; these are not invoices.
- `LeaseRentEscalationRule` — dated fixed or percentage escalation rules.
- `LeaseLateFeeRule` — one late-fee policy per billing calendar.
- `LeaseSecurityDeposit` — required, held, and refunded balances without a payment ledger.

Supported cycles are `MONTHLY`, `WEEKLY`, `QUARTERLY`, `HALF_YEARLY`, `YEARLY`, and `CUSTOM`. The migration enforces a positive interval for a custom cycle and forbids one for every other cycle. It also provides restrictive foreign keys, one-to-one constraints, schedule uniqueness, financial non-negativity checks, date-range constraints, and a deposit rule preventing refunds above the held amount.

## Backend and RBAC

`BillingRepository` is persistence-only. `BillingService` owns validation, transaction boundaries, schedule construction, proration, escalation calculation, and audit behavior. It follows the established active `OWNER`, `ADMIN`, or `PROPERTY_MANAGER` membership authorization and resolves the lease through its organization.

Transactional audit actions:

- `lease.billing.created`
- `lease.billing.updated`
- `lease.security_deposit.updated`
- `lease.rent_schedule.generated`

Schedule generation uses existing lease terms, applies active escalation rules, applies daily proration only to an incomplete final period, and records a generation watermark. It never creates an invoice or marks a schedule paid.

## Endpoints and Swagger

Swagger-documented and bearer/route-organization guarded routes are under `/api/v1/organizations/{organizationId}/leases/{leaseId}/billing`:

- `POST /` — create calendar, rules, and deposit tracker
- `GET /` — retrieve billing configuration
- `PATCH /` — update status, due-date policy, proration, or late-fee rule
- `PATCH /security-deposit` — update deposit tracking only
- `GET /schedules` — list generated planning rows
- `POST /schedules/generate` — generate rows through a date

## Files modified or added

- `prisma/schemas/rental.prisma`
- `prisma/migrations/20260716130000_billing_rent_schedule_foundation/migration.sql`
- `apps/api/src/rental/rental.module.ts`
- `apps/api/src/rental/dto/billing.dto.ts`
- `apps/api/src/rental/billing.repository.ts`
- `apps/api/src/rental/billing.service.ts`
- `apps/api/src/rental/billing.controller.ts`
- `apps/api/test/billing.service.test.mjs`

## Tests

Focused service tests cover custom-cycle validation, monthly schedule creation, final-period daily proration, percentage escalation, and deposit refund validation.

PostgreSQL and HTTP integration tests remain pending an available package runtime and disposable database. They must cover migration execution, organization isolation, duplicate-calendar concurrency, schedule-generation concurrency, and database constraints.

## Verification status

Not verified. The prerequisite Prisma attempt could not restore workspace dependencies because DNS could not resolve `registry.npmjs.org` (`ENOTFOUND`). No Prisma validation, typecheck, build, or test result is claimed.

When dependencies and PostgreSQL are available, run:

```bash
pnpm install --frozen-lockfile
pnpm prisma format --schema prisma/schemas
pnpm prisma validate --schema prisma/schemas
pnpm prisma generate --schema prisma/schemas
pnpm migrate
pnpm --filter @noagent4u/api typecheck
pnpm --filter @noagent4u/api build
pnpm --filter @noagent4u/api test
```

## Remaining work

- Apply migration and run PostgreSQL/API integration tests.
- Implement invoices, payments, accounting, GST, receipts, notifications, and communication only in their designated future sprints.
- Add job-based due/overdue status transitions later; this foundation stores schedule state but includes no scheduler or notification behavior.
