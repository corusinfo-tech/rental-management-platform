-- Additive unit-management status extension. Occupancy remains a separate enum.
ALTER TYPE "UnitStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';
