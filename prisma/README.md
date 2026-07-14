# Prisma architecture

The schema folder is configured at `prisma/schemas/`. `schema.prisma` owns the PostgreSQL datasource and Prisma Client generator; the remaining files reserve domain-specific schema boundaries without defining models.

Run `pnpm --filter @noagent4u/database prisma:validate` to validate the schema.

- `migrations/` stores generated Prisma migrations.
- `seed/` stores future seed scripts.

## Public-registration hardening migration

`20260713193000_public_registration_hardening` adds the `OutboxEvent` table, owner membership persistence (`OrganizationMembership.isOwner`), and a partial unique index that permits one active owner per organization. The registration transaction writes `UserRegistered` and `VerificationRequested` events with IDs and non-sensitive workflow metadata only; no delivery worker or plaintext verification secret is stored.
