-- Add an explicit successful email-verification lifecycle state.
ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'VERIFIED';

CREATE OR REPLACE FUNCTION "enforce_verification_lifecycle"() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."status" IN ('CONSUMED', 'VERIFIED') AND NEW."consumedAt" IS NOT NULL AND NEW."expiresAt" <= CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'expired verification cannot be consumed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
