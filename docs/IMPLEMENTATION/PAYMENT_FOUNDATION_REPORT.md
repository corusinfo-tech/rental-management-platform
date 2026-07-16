# Payment Management Foundation Report

## Scope

This sprint extends the existing Finance module with payments against existing organization invoices. It does not redesign Lease, Billing, Invoice, or Credit Note and does not add payment-gateway integrations, GST ledgers, accounting journals, bank reconciliation, notifications, email, SMS, or WhatsApp.

## Database

Additive migration: `20260716150000_payment_management_foundation`.

### Entities

- `Payment` — completed payment record with method, purpose, currency, allocated balance, unapplied advance balance, refund totals, external reference, and payment date.
- `PaymentAllocation` — many-to-many allocation between payments and invoices.
- `Receipt` — immutable receipt metadata, one-to-one with a payment.
- `OrganizationReceiptSequence` — atomic organization-scoped receipt numbering.
- `Refund` — pending refund foundation record with reserved refundable balance.

The existing `Invoice` receives only a reverse `PaymentAllocation[]` relation. Existing Invoice and Credit Note structures were not redesigned.

### Enums

Payment methods:

- `CASH`
- `UPI`
- `BANK_TRANSFER`
- `CHEQUE`
- `CREDIT_CARD`
- `DEBIT_CARD`
- `ONLINE_PAYMENT_GATEWAY`

Payment purposes:

- `INVOICE`
- `ADVANCE`
- `SECURITY_DEPOSIT`

Refund statuses are provided for future lifecycle work, but this sprint creates refunds only as `PENDING` reservations.

### Constraints and indexes

- Payment and receipt numbers are unique within an organization.
- Non-null external references are unique per organization and payment method.
- One receipt is permitted per payment.
- One allocation row is permitted per payment/invoice pair.
- Payment and allocation amounts must be positive.
- Allocated plus unapplied amount must equal the payment amount.
- Only advance payments may retain unapplied value.
- Refunded plus reserved-refund value cannot exceed the payment amount.
- All financial foreign keys use `ON DELETE RESTRICT`.
- Organization, payment status, method, purpose, invoice, receipt date, refund status, and external-reference indexes are included.

## Business rules implemented

### Allocations

- Every payment must initially allocate a positive amount to at least one existing invoice.
- One payment can allocate to multiple invoices.
- Multiple completed payments can allocate to one invoice.
- Invoices must belong to the route organization and be `ISSUED`, `OVERDUE`, or `PARTIALLY_PAID`.
- One payment cannot cross currencies.
- Conditional invoice updates and serializable transactions prevent concurrent overpayment.
- Partial allocations mark an invoice `PARTIALLY_PAID`.
- A zero remaining balance marks the invoice `PAID`.

### Advance payments

- Only `ADVANCE` payments may retain an unapplied remainder.
- An advance must still originate against at least one existing invoice.
- Unapplied advance can later be allocated to another eligible invoice through a dedicated endpoint.
- Later allocation updates the original payment totals, allocation record, invoice balance, and invoice status transactionally.

### Security deposits

- `SECURITY_DEPOSIT` payments require a security-deposit invoice line.
- Allocation cannot exceed the unallocated security-deposit line value.
- The existing lease billing-calendar deposit tracker is updated transactionally.
- Held deposit cannot exceed the configured required amount.

### Receipts

- Every recorded payment creates exactly one receipt in the same transaction.
- Organization-scoped numbering defaults to `RCT-00000001`.
- Payment identifiers use the same atomic sequence as `PAY-00000001`.
- No PDF, email, SMS, or notification delivery is implemented.

### Refund foundation

- A pending refund reserves value from a completed payment.
- Reserved and previously refunded amounts cannot exceed the payment amount.
- This sprint does not approve, settle, reject, or reverse refund allocations.

### Outstanding recalculation

- The recalculation endpoint derives outstanding balance from invoice total, issued credit total, and completed payment allocations.
- It rejects corrupt allocation totals above the invoice net amount.
- It updates `PARTIALLY_PAID` and `PAID` statuses accordingly.

## Transactions and concurrency

Payment creation, allocations, invoice balance/status updates, security-deposit tracking, receipt creation, and audit records execute in a Prisma transaction with PostgreSQL `SERIALIZABLE` isolation.

Invoice decrements include a conditional `outstandingBalance >= allocation` predicate. Serialization failures are returned as conflicts so callers can retry safely.

## RBAC and audit

All operations require an active organization membership with `OWNER`, `ADMIN`, or `PROPERTY_MANAGER` role and reuse the existing access-token and route-organization guards.

Transactional audit actions:

- `payment.created`
- `payment.allocated`
- `payment.advance.allocated`
- `receipt.created`
- `payment.refund.requested`
- `invoice.outstanding.recalculated`

## API and Swagger

All endpoints are versioned under `/api/v1`, bearer-authenticated, organization-scoped, DTO-validated, and documented under the `Payments` Swagger tag.

- `POST /organizations/{organizationId}/payments`
- `GET /organizations/{organizationId}/payments`
- `GET /organizations/{organizationId}/payments/{paymentId}`
- `POST /organizations/{organizationId}/payments/{paymentId}/allocations`
- `POST /organizations/{organizationId}/payments/{paymentId}/refunds`
- `POST /organizations/{organizationId}/invoices/{invoiceId}/recalculate-outstanding`

Payment listing supports pagination, method, purpose and status filtering, and payment-number/external-reference search.

## Files modified or added

- `prisma/schemas/finance.prisma`
- `prisma/schemas/organization.prisma`
- `prisma/migrations/20260716150000_payment_management_foundation/migration.sql`
- `apps/api/src/finance/finance.module.ts`
- `apps/api/src/finance/dto/payment.dto.ts`
- `apps/api/src/finance/payment.repository.ts`
- `apps/api/src/finance/payment.service.ts`
- `apps/api/src/finance/payment.controller.ts`
- `apps/api/test/payment.service.test.mjs`
- `docs/IMPLEMENTATION/PAYMENT_FOUNDATION_REPORT.md`

## Tests

Eight focused Payment service tests pass:

1. Partial payment, balance reduction, status, and receipt.
2. One payment allocated across multiple invoices.
3. Advance-payment remainder tracking.
4. Later allocation of unapplied advance value.
5. Overpayment rejection without balance mutation.
6. Security-deposit line enforcement.
7. Refund reservation and excess-refund rejection.
8. Outstanding-balance recalculation using credits and completed allocations.

## Verification results

- Prisma format: **PASS**.
- Prisma validate: **PASS** using a non-secret local placeholder `DATABASE_URL`; validation made no database connection.
- Prisma Client generation: **PASS**, Prisma 6.19.3.
- API TypeScript typecheck: **PASS** using the bundled TypeScript CLI.
- API build: **PASS** using the bundled TypeScript CLI.
- Focused Payment tests: **PASS**, 8 passed and 0 failed.
- Complete API test suite: **FAIL**, 63 passed and 7 failed. The failures are the same pre-existing Organization Invitation, Organization Settings, Public Registration, and Verification Subject tests; no Payment, Invoice, Billing, Lease, or Property test failed.
- PostgreSQL migration application: **NOT VERIFIED** because Docker/PostgreSQL are unavailable.
- Standard workspace `pnpm` typecheck/build wrappers: **NOT VERIFIED** because the current dependency layout does not expose package-local `tsc` binaries; direct API commands pass.

No claim is made that migrations or the full repository test suite pass.

## Remaining work

- Apply the migration to a disposable PostgreSQL database.
- Add PostgreSQL integration tests for serializable concurrent allocations, concurrent refunds, receipt numbering, external-reference uniqueness, constraint enforcement, rollback, and organization isolation.
- Add HTTP integration tests for every Payment endpoint and Swagger response contract.
- Resolve the seven unrelated pre-existing API test failures before claiming a green repository suite.
- Repair workspace binary linking so standard `pnpm typecheck`, `pnpm build`, and `pnpm test` run without direct CLI paths.
- Implement refund approval, settlement, rejection, and allocation reversal in a later Refund lifecycle story.
- Implement payment cancellation/reversal separately; completed financial records are deliberately not soft-deleted.
- Implement gateway providers, GST, accounting journals, reconciliation, receipts rendering, and notifications only in their designated future sprints.
