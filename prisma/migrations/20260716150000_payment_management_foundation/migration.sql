CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'DEBIT_CARD', 'ONLINE_PAYMENT_GATEWAY');
CREATE TYPE "PaymentPurpose" AS ENUM ('INVOICE', 'ADVANCE', 'SECURITY_DEPOSIT');
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'CANCELLED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

CREATE TABLE "OrganizationReceiptSequence" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "prefix" TEXT NOT NULL DEFAULT 'RCT', "nextValue" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OrganizationReceiptSequence_pkey" PRIMARY KEY ("id"), CONSTRAINT "OrganizationReceiptSequence_next_check" CHECK ("nextValue" > 0));
CREATE TABLE "Payment" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "paymentNumber" TEXT NOT NULL, "method" "PaymentMethod" NOT NULL, "purpose" "PaymentPurpose" NOT NULL DEFAULT 'INVOICE', "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED', "currency" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "allocatedAmount" DECIMAL(14,2) NOT NULL, "unappliedAmount" DECIMAL(14,2) NOT NULL, "refundedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0, "refundReservedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0, "externalReference" TEXT, "notes" TEXT, "paidAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"), CONSTRAINT "Payment_amounts_check" CHECK ("amount" > 0 AND "allocatedAmount" > 0 AND "unappliedAmount" >= 0 AND "refundedAmount" >= 0 AND "refundReservedAmount" >= 0 AND "allocatedAmount" + "unappliedAmount" = "amount" AND "refundedAmount" + "refundReservedAmount" <= "amount"), CONSTRAINT "Payment_advance_check" CHECK ("purpose" = 'ADVANCE' OR "unappliedAmount" = 0));
CREATE TABLE "PaymentAllocation" ("id" TEXT NOT NULL, "paymentId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id"), CONSTRAINT "PaymentAllocation_amount_check" CHECK ("amount" > 0));
CREATE TABLE "Receipt" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "paymentId" TEXT NOT NULL, "receiptNumber" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "currency" TEXT NOT NULL, "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id"), CONSTRAINT "Receipt_amount_check" CHECK ("amount" > 0));
CREATE TABLE "Refund" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "paymentId" TEXT NOT NULL, "status" "RefundStatus" NOT NULL DEFAULT 'PENDING', "amount" DECIMAL(14,2) NOT NULL, "reason" TEXT NOT NULL, "externalReference" TEXT, "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Refund_pkey" PRIMARY KEY ("id"), CONSTRAINT "Refund_amount_check" CHECK ("amount" > 0));

CREATE UNIQUE INDEX "OrganizationReceiptSequence_organizationId_key" ON "OrganizationReceiptSequence"("organizationId");
CREATE UNIQUE INDEX "Payment_organizationId_paymentNumber_key" ON "Payment"("organizationId", "paymentNumber");
CREATE UNIQUE INDEX "Payment_organizationId_method_externalReference_key" ON "Payment"("organizationId", "method", "externalReference");
CREATE INDEX "Payment_organizationId_status_paidAt_idx" ON "Payment"("organizationId", "status", "paidAt");
CREATE INDEX "Payment_organizationId_method_purpose_idx" ON "Payment"("organizationId", "method", "purpose");
CREATE INDEX "Payment_externalReference_idx" ON "Payment"("externalReference");
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_invoiceId_key" ON "PaymentAllocation"("paymentId", "invoiceId");
CREATE INDEX "PaymentAllocation_invoiceId_createdAt_idx" ON "PaymentAllocation"("invoiceId", "createdAt");
CREATE UNIQUE INDEX "Receipt_paymentId_key" ON "Receipt"("paymentId");
CREATE UNIQUE INDEX "Receipt_organizationId_receiptNumber_key" ON "Receipt"("organizationId", "receiptNumber");
CREATE INDEX "Receipt_organizationId_issuedAt_idx" ON "Receipt"("organizationId", "issuedAt");
CREATE INDEX "Refund_paymentId_status_requestedAt_idx" ON "Refund"("paymentId", "status", "requestedAt");
CREATE INDEX "Refund_organizationId_status_requestedAt_idx" ON "Refund"("organizationId", "status", "requestedAt");

ALTER TABLE "OrganizationReceiptSequence" ADD CONSTRAINT "OrganizationReceiptSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
