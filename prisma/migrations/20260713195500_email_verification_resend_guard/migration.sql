-- One active email-verification record per user prevents concurrent resend races.
CREATE UNIQUE INDEX "Verification_one_active_email_per_user"
  ON "Verification"("userId")
  WHERE "channel" = 'EMAIL'
    AND "purpose" = 'EMAIL_VERIFICATION'
    AND "status" = 'PENDING';
