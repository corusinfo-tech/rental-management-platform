CREATE TYPE "VerificationSubjectType" AS ENUM ('USER', 'INVITATION', 'EMAIL', 'PHONE', 'PASSWORD_RESET', 'MAGIC_LINK');
ALTER TABLE "Verification" ADD COLUMN "subjectType" "VerificationSubjectType" NOT NULL DEFAULT 'USER';
ALTER TABLE "Verification" ADD COLUMN "subjectReferenceId" TEXT;
UPDATE "Verification" SET "subjectReferenceId" = "userId" WHERE "subjectReferenceId" IS NULL;
ALTER TABLE "Verification" ALTER COLUMN "subjectReferenceId" SET NOT NULL;
ALTER TABLE "Verification" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_subject_user_consistency_check"
  CHECK (("subjectType" = 'USER' AND "userId" IS NOT NULL AND "subjectReferenceId" = "userId")
      OR ("subjectType" <> 'USER' AND "userId" IS NULL));
CREATE INDEX "Verification_subjectType_subjectReferenceId_channel_purpose_status_expiresAt_idx" ON "Verification"("subjectType", "subjectReferenceId", "channel", "purpose", "status", "expiresAt");
