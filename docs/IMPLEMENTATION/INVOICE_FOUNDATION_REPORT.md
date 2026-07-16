# Invoice Foundation Report

## Scope

This sprint implements an organization-scoped Invoice foundation generated exclusively from existing `LeaseRentSchedule` records. It does not implement payments, GST calculations, accounting entries, receipts, notifications, email, SMS, or WhatsApp.

## Database

Additive migration: `20260716140000_invoice_foundation`.

### Entities

- `OrganizationInvoiceSequence` allocates organization-scoped invoice numbers atomically. The default format is `INV-00000001`.
- `Invoice` references exactly one Organization, Lease, and `LeaseRentSchedule`. `rentScheduleId` is unique, enforcing at most one invoice per schedule.
- `InvoiceLine` stores typed, ordered line items using exact decimal quantities and monetary values.
- `CreditNote` provides draft and issued credit-note records linked to their original invoice.

Supported invoice line types:

- `RENT`
- `SECURITY_DEPOSIT`
- `MAINTENANCE`
- `UTILITY`
- `PARKING`
- `MISCELLANEOUS`

Invoice statuses are `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `VOID`, and `ARCHIVED`. Payment-derived statuses are reserved for the future Payments sprint and cannot be assigned through the current API.

Database protections include:

- Unique organization/invoice number.
- Unique invoice/rent-schedule assignment.
- Unique organization/credit-note number.
- Positive invoice and credit-note sequence values.
- Positive quantities and non-negative line amounts.
- Non-negative totals, credits, and outstanding balances.
- Outstanding and credited amounts cannot exceed invoice total.
- Restrictive foreign keys; financial history is never cascade-deleted.
- Search indexes covering organization, status, due date, lease, creation time, and soft-delete state.

## Application architecture

The Finance module contains:

- `InvoiceRepository` for persistence and organization-scoped lookups only.
- `InvoiceService` for authorization, number allocation, state transitions, exact decimal calculations, transactions, and audit events.
- `InvoiceController` for the versioned HTTP API.
- Validated and Swagger-decorated request/query DTOs.

Invoice generation derives the lease, organization, due date, currency, mandatory rent line, and rent amount from the selected schedule. Additional line types may be supplied, but a caller cannot replace or omit the schedule-derived rent line.

Organization access requires an active membership with `OWNER`, `ADMIN`, or `PROPERTY_MANAGER`. The rent schedule is resolved through Calendar → Lease → Organization, preventing cross-organization generation through the API.

Invoice status transitions are limited to:

- `DRAFT` → `ISSUED` or `VOID`
- `ISSUED` → `OVERDUE` or `VOID`
- `OVERDUE` → `VOID`

Soft deletion stores the previous status in `archivedFromStatus`; restoration reinstates that status instead of silently returning an issued invoice to draft.

Issued credit notes reduce the outstanding balance transactionally. A per-invoice atomic sequence generates numbers such as `CN-INV-00000001-001`. Credit notes exceeding the current outstanding balance are rejected.

## Audit events

- `invoice.created`
- `invoice.updated`
- `invoice.credit_note.created`
- `invoice.archived`
- `invoice.restored`

Every mutation and its audit event share one Prisma transaction.

## API and Swagger

All endpoints are bearer-authenticated, route-organization guarded, versioned under `/api/v1`, and documented under the `Invoices` Swagger tag.

- `POST /organizations/{organizationId}/invoices`
- `GET /organizations/{organizationId}/invoices`
- `GET /organizations/{organizationId}/invoices/{invoiceId}`
- `PATCH /organizations/{organizationId}/invoices/{invoiceId}`
- `POST /organizations/{organizationId}/invoices/{invoiceId}/credit-notes`
- `DELETE /organizations/{organizationId}/invoices/{invoiceId}`
- `POST /organizations/{organizationId}/invoices/{invoiceId}/restore`

Invoice listing supports pagination, status and lease filtering, due-date range filtering, and case-insensitive search by invoice number or lease code.

## Files modified or added

### Invoice implementation

- `prisma/schemas/finance.prisma`
- `prisma/schemas/organization.prisma`
- `prisma/schemas/rental.prisma`
- `prisma/migrations/20260716140000_invoice_foundation/migration.sql`
- `apps/api/src/app.module.ts`
- `apps/api/tsconfig.json`
- `apps/api/src/finance/finance.module.ts`
- `apps/api/src/finance/dto/invoice.dto.ts`
- `apps/api/src/finance/invoice.repository.ts`
- `apps/api/src/finance/invoice.service.ts`
- `apps/api/src/finance/invoice.controller.ts`
- `apps/api/test/invoice.service.test.mjs`

### Minimal prerequisite compile corrections

- `prisma/schemas/rental.prisma`: expanded pre-existing one-line Lease/Billing enum declarations into valid Prisma syntax.
- `apps/api/src/property/property.repository.ts`: restored one missing closing brace in the existing list query.
- `apps/api/src/identity/authorization/route-organization-context.guard.ts`: safely normalized `string | string[]` route parameters.

No Property, Lease, Billing, or Identity business behavior was redesigned.

## Tests

Five focused invoice service tests were added and pass:

1. Schedule-derived mandatory rent line and additional line totals.
2. Duplicate schedule invoice rejection.
3. Issued credit note and transactional outstanding-balance adjustment.
4. Excess credit-note rejection.
5. Soft-delete status preservation.

## Verification results

- Frozen-lockfile dependency restoration: completed after adding the bundled Node runtime to the command environment.
- `prisma format --schema prisma/schemas`: PASS.
- `prisma validate --schema prisma/schemas`: PASS using a non-secret disposable local URL value; no database connection was made by validation.
- `prisma generate --schema prisma/schemas`: PASS, Prisma Client 6.19.3.
- API TypeScript typecheck: PASS using the bundled TypeScript CLI.
- API build: PASS using the bundled TypeScript CLI.
- Focused invoice tests: PASS, 5 passed, 0 failed.
- Full API unit suite: FAIL, 55 passed and 7 failed. The failures are pre-existing tests in Organization Invitations, Organization Settings, Public Registration, and Verification Subjects; none are in Invoice, Lease, Billing, or Property tests.
- Workspace Turbo typecheck: NOT VERIFIED because pnpm package scripts cannot resolve their local `tsc` binary in the current linked dependency layout. Direct API typecheck passes.
- PostgreSQL migration application: NOT VERIFIED because Docker and PostgreSQL are unavailable in this environment.

No full-suite, migration, or production-readiness success is claimed.

## Remaining work

- Apply all migrations to an empty disposable PostgreSQL database and verify rollback/replay behavior.
- Add repository and HTTP integration tests for organization isolation, concurrent invoice generation, concurrent number allocation, database constraints, search, pagination, archive, and restore.
- Resolve the seven unrelated pre-existing API test failures before claiming the repository test suite is green.
- Repair workspace package binary linking so standard `pnpm typecheck`, `pnpm build`, and `pnpm test` commands run without direct CLI paths.
- Add credit-note lifecycle transitions in a later Finance story if draft credit notes must be issued or voided after creation.
- Implement payments, GST, accounting entries, receipts, and delivery providers only in their designated future sprints.
