CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'ARCHIVED');
CREATE TYPE "InvoiceLineType" AS ENUM ('RENT', 'SECURITY_DEPOSIT', 'MAINTENANCE', 'UTILITY', 'PARKING', 'MISCELLANEOUS');
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOID', 'ARCHIVED');

CREATE TABLE "OrganizationInvoiceSequence" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "prefix" TEXT NOT NULL DEFAULT 'INV',
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationInvoiceSequence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationInvoiceSequence_next_check" CHECK ("nextValue" > 0)
);

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "rentScheduleId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "archivedFromStatus" "InvoiceStatus",
  "issuedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "subtotal" DECIMAL(14,2) NOT NULL,
  "creditTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL,
  "outstandingBalance" DECIMAL(14,2) NOT NULL,
  "nextCreditNoteValue" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Invoice_amounts_check" CHECK ("subtotal" >= 0 AND "creditTotal" >= 0 AND "total" >= 0 AND "outstandingBalance" >= 0 AND "creditTotal" <= "total" AND "outstandingBalance" <= "total"),
  CONSTRAINT "Invoice_credit_note_sequence_check" CHECK ("nextCreditNoteValue" > 0)
);

CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "type" "InvoiceLineType" NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
  "unitAmount" DECIMAL(14,2) NOT NULL,
  "lineTotal" DECIMAL(14,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceLine_amounts_check" CHECK ("quantity" > 0 AND "unitAmount" >= 0 AND "lineTotal" >= 0)
);

CREATE TABLE "CreditNote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "creditNoteNumber" TEXT NOT NULL,
  "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "amount" DECIMAL(14,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreditNote_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "OrganizationInvoiceSequence_organizationId_key" ON "OrganizationInvoiceSequence"("organizationId");
CREATE UNIQUE INDEX "Invoice_rentScheduleId_key" ON "Invoice"("rentScheduleId");
CREATE UNIQUE INDEX "Invoice_organizationId_invoiceNumber_key" ON "Invoice"("organizationId", "invoiceNumber");
CREATE INDEX "Invoice_organizationId_status_dueAt_deletedAt_idx" ON "Invoice"("organizationId", "status", "dueAt", "deletedAt");
CREATE INDEX "Invoice_organizationId_createdAt_idx" ON "Invoice"("organizationId", "createdAt");
CREATE INDEX "Invoice_leaseId_dueAt_idx" ON "Invoice"("leaseId", "dueAt");
CREATE INDEX "InvoiceLine_invoiceId_sortOrder_idx" ON "InvoiceLine"("invoiceId", "sortOrder");
CREATE INDEX "InvoiceLine_type_idx" ON "InvoiceLine"("type");
CREATE UNIQUE INDEX "CreditNote_organizationId_creditNoteNumber_key" ON "CreditNote"("organizationId", "creditNoteNumber");
CREATE INDEX "CreditNote_invoiceId_status_deletedAt_idx" ON "CreditNote"("invoiceId", "status", "deletedAt");
CREATE INDEX "CreditNote_organizationId_createdAt_idx" ON "CreditNote"("organizationId", "createdAt");

ALTER TABLE "OrganizationInvoiceSequence" ADD CONSTRAINT "OrganizationInvoiceSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_rentScheduleId_fkey" FOREIGN KEY ("rentScheduleId") REFERENCES "LeaseRentSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
