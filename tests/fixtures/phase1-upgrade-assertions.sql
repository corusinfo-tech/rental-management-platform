\set ON_ERROR_STOP on

DO $$
BEGIN
  IF (SELECT count(*) FROM "Organization") <> 2 THEN RAISE EXCEPTION 'expected 2 organizations'; END IF;
  IF (SELECT count(*) FROM "OrganizationSettings") <> 2 THEN RAISE EXCEPTION 'settings backfill mismatch'; END IF;
  IF (SELECT count(*) FROM "PlatformPrincipal") <> 1 THEN RAISE EXCEPTION 'platform principal backfill mismatch'; END IF;
  IF (SELECT count(*) FROM "PropertyPortfolioAssignment") <> 0 THEN RAISE EXCEPTION 'portfolio assignments must not be inferred'; END IF;
  IF (SELECT count(*) FROM "LeaseParty" WHERE "personId" IS NOT NULL OR "linkVerificationId" IS NOT NULL) <> 0 THEN RAISE EXCEPTION 'tenant links must not be inferred'; END IF;
  IF (SELECT "propertyId" FROM "Payment" WHERE "id" = 'payment-single') IS DISTINCT FROM 'property-a1' THEN RAISE EXCEPTION 'unambiguous payment was not backfilled'; END IF;
  IF (SELECT "propertyId" FROM "Payment" WHERE "id" = 'payment-multi') IS NOT NULL THEN RAISE EXCEPTION 'multi-property payment must remain denied'; END IF;
  IF (SELECT "propertyId" FROM "Payment" WHERE "id" = 'payment-cross-org') IS NOT NULL THEN RAISE EXCEPTION 'cross-organization payment must remain denied'; END IF;
  IF EXISTS (SELECT 1 FROM "Payment" payment JOIN "Property" property ON property."id" = payment."propertyId" WHERE payment."organizationId" <> property."organizationId") THEN RAISE EXCEPTION 'cross-organization payment scope was created'; END IF;
  IF EXISTS (SELECT 1 FROM "Property" WHERE "createdByUserId" IS DISTINCT FROM "ownerUserId") THEN RAISE EXCEPTION 'property creator backfill mismatch'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "OrganizationMembership" membership
    JOIN "MembershipRole" membership_role ON membership_role."membershipId" = membership."id"
    JOIN "Role" role ON role."id" = membership_role."roleId"
    WHERE membership."id" = 'membership-asset' AND role."code" = 'ASSET_OWNER'
  ) THEN RAISE EXCEPTION 'legacy non-proprietor OWNER was not converted'; END IF;
  IF EXISTS (
    SELECT 1 FROM "OrganizationMembership" membership
    JOIN "MembershipRole" membership_role ON membership_role."membershipId" = membership."id"
    JOIN "Role" role ON role."id" = membership_role."roleId"
    WHERE membership."id" = 'membership-asset' AND role."code" = 'OWNER'
  ) THEN RAISE EXCEPTION 'legacy non-proprietor OWNER bypass remains'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "OrganizationMembership" membership
    JOIN "MembershipRole" membership_role ON membership_role."membershipId" = membership."id"
    JOIN "Role" role ON role."id" = membership_role."roleId"
    WHERE membership."id" = 'membership-proprietor' AND role."code" = 'ORG_PROPRIETOR'
  ) THEN RAISE EXCEPTION 'proprietor role backfill mismatch'; END IF;
END $$;

SELECT
  (SELECT count(*) FROM "Organization") AS organizations,
  (SELECT count(*) FROM "OrganizationSettings") AS settings,
  (SELECT count(*) FROM "PlatformPrincipal") AS platform_principals,
  (SELECT count(*) FROM "PropertyPortfolioAssignment") AS portfolio_assignments,
  (SELECT count(*) FROM "LeaseParty" WHERE "personId" IS NOT NULL OR "linkVerificationId" IS NOT NULL) AS linked_lease_parties,
  (SELECT count(*) FROM "Payment" WHERE "propertyId" IS NOT NULL) AS matched_payments,
  (SELECT count(*) FROM "Payment" WHERE "propertyId" IS NULL) AS denied_unmatched_payments;

SELECT "id", COALESCE("propertyId", '<DENIED_NULL>') AS property_scope
FROM "Payment" ORDER BY "id";
