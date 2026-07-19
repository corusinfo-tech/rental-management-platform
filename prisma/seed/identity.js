const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const permissions = [
  ['identity.profile.read', 'Read identity profile'],
  ['identity.profile.write', 'Update identity profile'],
  ['organization.members.read', 'Read organization memberships'],
  ['organization.members.manage', 'Manage organization memberships'],
  ['organization.roles.read', 'Read organization roles'],
  ['organization.roles.manage', 'Manage organization roles'],
  ['organization.settings.manage', 'Manage organization settings'],
  ['organization.settings.read', 'Read organization settings'],
  ['portfolio.access.all', 'Access every property in the organization'],
  ['property.read', 'Read assigned properties'],
  ['property.manage', 'Manage assigned properties'],
  ['lease.read', 'Read leases in the assigned portfolio'],
  ['lease.manage', 'Manage leases in the assigned portfolio'],
  ['invoice.read', 'Read invoices in the assigned portfolio'],
  ['invoice.manage', 'Manage invoices in the assigned portfolio'],
  ['payment.read', 'Read payments in the assigned portfolio'],
  ['payment.manage', 'Manage payments in the assigned portfolio'],
];

const organizationWide = permissions.map(([code]) => code);
const portfolioRead = ['identity.profile.read', 'property.read', 'lease.read', 'invoice.read', 'payment.read'];

const roles = [
  ['SUPER_ADMIN', 'Legacy Platform Super Administrator', []],
  ['OWNER', 'Legacy Owner', organizationWide],
  ['ORG_PROPRIETOR', 'Organization Proprietor', organizationWide],
  ['ASSET_OWNER', 'Managed Property Asset Owner', portfolioRead],
  ['ADMIN', 'Administrator', organizationWide],
  ['PROPERTY_MANAGER', 'Property Manager', ['identity.profile.read', 'organization.members.read', 'property.read', 'property.manage', 'lease.read', 'lease.manage', 'invoice.read', 'payment.read']],
  ['FINANCE', 'Finance', ['identity.profile.read', 'invoice.read', 'invoice.manage', 'payment.read', 'payment.manage']],
  ['MAINTENANCE', 'Maintenance', ['identity.profile.read']],
  ['SUPPORT', 'Support', ['identity.profile.read']],
  ['VIEWER', 'Viewer', portfolioRead],
  ['LANDLORD', 'Legacy Landlord', organizationWide],
  ['AGENT', 'Agent', ['identity.profile.read', 'organization.members.read']],
  ['TENANT', 'Tenant', ['identity.profile.read', 'identity.profile.write']],
];

async function main() {
  for (const [code, name] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { name, deletedAt: null },
      create: { code, name },
    });
  }

  for (const [code, name, permissionCodes] of roles) {
    const existingRole = await prisma.role.findFirst({ where: { organizationId: null, code } });
    const role = existingRole
      ? await prisma.role.update({ where: { id: existingRole.id }, data: { name, isSystem: true, deletedAt: null } })
      : await prisma.role.create({ data: { code, name, isSystem: true } });
    for (const permissionCode of permissionCodes) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}

main()
  .finally(async () => prisma.$disconnect());
