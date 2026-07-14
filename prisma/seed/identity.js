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
];

const roles = [
  ['SUPER_ADMIN', 'Platform Super Administrator', permissions.map(([code]) => code)],
  ['OWNER', 'Owner', permissions.map(([code]) => code)],
  ['ADMIN', 'Administrator', permissions.map(([code]) => code)],
  ['PROPERTY_MANAGER', 'Property Manager', ['identity.profile.read', 'organization.members.read']],
  ['FINANCE', 'Finance', ['identity.profile.read']],
  ['MAINTENANCE', 'Maintenance', ['identity.profile.read']],
  ['SUPPORT', 'Support', ['identity.profile.read']],
  ['VIEWER', 'Viewer', ['identity.profile.read']],
  ['LANDLORD', 'Landlord', ['identity.profile.read', 'identity.profile.write', 'organization.members.read', 'organization.roles.manage', 'organization.settings.manage']],
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
