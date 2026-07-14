-- Additive public-registration states. Existing users retain their current status.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_EMAIL';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
