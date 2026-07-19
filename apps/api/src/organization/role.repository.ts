import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrganizationRoleRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }); }
  ownerMembership(userId: string, organizationId: string, transaction: Prisma.TransactionClient) { return transaction.organizationMembership.findFirst({ where: { organizationId, status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } }, roles: { some: { role: { code: { notIn: ['SUPER_ADMIN', 'OWNER', 'LANDLORD'] }, deletedAt: null, permissions: { some: { permission: { code: 'organization.roles.manage', deletedAt: null } } } } } } } }); }
  list(organizationId: string) { return this.prisma.role.findMany({ where: { deletedAt: null, OR: [{ organizationId }, { organizationId: null, isSystem: true }] }, include: { permissions: { where: { permission: { deletedAt: null } }, include: { permission: true } } }, orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] }); }
  findCustom(roleId: string, organizationId: string, transaction: Prisma.TransactionClient) { return transaction.role.findFirst({ where: { id: roleId, organizationId, isSystem: false, deletedAt: null }, include: { permissions: { include: { permission: true } } } }); }
  findCustomByName(name: string, organizationId: string, transaction: Prisma.TransactionClient) { return transaction.role.findFirst({ where: { organizationId, name: { equals: name, mode: 'insensitive' }, isSystem: false, deletedAt: null } }); }
  findAssignable(roleId: string, organizationId: string, transaction: Prisma.TransactionClient) { return transaction.role.findFirst({ where: { id: roleId, deletedAt: null, OR: [{ organizationId }, { organizationId: null, isSystem: true }] } }); }
  create(input: { organizationId: string; code: string; name: string; description?: string; isDefault: boolean }, transaction: Prisma.TransactionClient) { return transaction.role.create({ data: { ...input, isSystem: false } }); }
  update(roleId: string, data: Prisma.RoleUpdateInput, transaction: Prisma.TransactionClient) { return transaction.role.update({ where: { id: roleId }, data }); }
  clearDefault(organizationId: string, exceptRoleId: string | undefined, transaction: Prisma.TransactionClient) { return transaction.role.updateMany({ where: { organizationId, isDefault: true, deletedAt: null, ...(exceptRoleId ? { id: { not: exceptRoleId } } : {}) }, data: { isDefault: false } }); }
  softDelete(roleId: string, transaction: Prisma.TransactionClient) { return transaction.role.update({ where: { id: roleId }, data: { deletedAt: new Date(), isDefault: false } }); }
  findPermissions(ids: string[], transaction: Prisma.TransactionClient) { return transaction.permission.findMany({ where: { id: { in: ids }, deletedAt: null } }); }
  rolePermissionIds(roleId: string, transaction: Prisma.TransactionClient) { return transaction.rolePermission.findMany({ where: { roleId }, select: { permissionId: true } }); }
  grantPermissions(roleId: string, permissionIds: string[], transaction: Prisma.TransactionClient) { return transaction.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId, permissionId })), skipDuplicates: true }); }
  revokePermissions(roleId: string, permissionIds: string[], transaction: Prisma.TransactionClient) { return transaction.rolePermission.deleteMany({ where: { roleId, permissionId: { in: permissionIds } } }); }
  findMembership(membershipId: string, organizationId: string, transaction: Prisma.TransactionClient) { return transaction.organizationMembership.findFirst({ where: { id: membershipId, organizationId, deletedAt: null } }); }
  assign(membershipId: string, roleId: string, assignedByUserId: string, transaction: Prisma.TransactionClient) { return transaction.membershipRole.upsert({ where: { membershipId_roleId: { membershipId, roleId } }, create: { membershipId, roleId, assignedByUserId }, update: { assignedByUserId, assignedAt: new Date() } }); }
  remove(membershipId: string, roleId: string, transaction: Prisma.TransactionClient) { return transaction.membershipRole.deleteMany({ where: { membershipId, roleId } }); }
  audit(actorUserId: string, action: string, metadata: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { const context = metadata as { organizationId: string; roleId?: string; membershipId?: string }; return transaction.identityAuditEvent.create({ data: { actorUserId, organizationId: context.organizationId, aggregateId: context.roleId ?? context.membershipId ?? context.organizationId, action, metadata } }); }
  outbox(eventType: string, aggregateType: string, aggregateId: string, organizationId: string, payload: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { return transaction.outboxEvent.create({ data: { eventType, aggregateType, aggregateId, organizationId, payload } }); }
}
