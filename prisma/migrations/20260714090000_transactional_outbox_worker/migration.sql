ALTER TYPE "OutboxEventStatus" ADD VALUE IF NOT EXISTS 'DEAD_LETTER';
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "leaseOwner" TEXT;
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP(3);
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_leaseExpiresAt_idx" ON "OutboxEvent"("leaseExpiresAt");
