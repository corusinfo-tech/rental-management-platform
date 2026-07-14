CREATE TYPE "VerificationDeliveryEnvelopeStatus" AS ENUM ('PENDING', 'PROCESSED', 'EXPIRED', 'DESTROYED');

CREATE TABLE "VerificationDeliveryEnvelope" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "ciphertext" BYTEA,
    "nonce" BYTEA,
    "authenticationTag" BYTEA,
    "keyVersion" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "aad" BYTEA,
    "status" "VerificationDeliveryEnvelopeStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "destroyedAt" TIMESTAMP(3),
    CONSTRAINT "VerificationDeliveryEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerificationDeliveryEnvelope_verificationId_key" ON "VerificationDeliveryEnvelope"("verificationId");
CREATE INDEX "VerificationDeliveryEnvelope_status_idx" ON "VerificationDeliveryEnvelope"("status");
CREATE INDEX "VerificationDeliveryEnvelope_expiresAt_idx" ON "VerificationDeliveryEnvelope"("expiresAt");
CREATE INDEX "VerificationDeliveryEnvelope_createdAt_idx" ON "VerificationDeliveryEnvelope"("createdAt");

ALTER TABLE "VerificationDeliveryEnvelope"
  ADD CONSTRAINT "VerificationDeliveryEnvelope_verificationId_fkey"
  FOREIGN KEY ("verificationId") REFERENCES "Verification"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
