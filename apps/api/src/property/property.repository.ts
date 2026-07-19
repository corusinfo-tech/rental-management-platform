import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback); }
  activeUserInOrganization(userId: string, organizationId: string, tx: Prisma.TransactionClient) { return tx.organizationMembership.findFirst({ where: { organizationId, status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } } } }); }
  list(where: Prisma.PropertyWhereInput, skip: number, take: number, orderBy: Prisma.PropertyOrderByWithRelationInput) { return this.prisma.property.findMany({ where, skip, take, orderBy, include: { address: true, _count: { select: { buildings: true, images: true, documents: true } } } }); }
  count(where: Prisma.PropertyWhereInput) { return this.prisma.property.count({ where }); }
  findActive(propertyId: string, organizationId: string) { return this.prisma.property.findFirst({ where: { id: propertyId, organizationId, deletedAt: null }, include: { address: true, buildings: { where: { deletedAt: null }, include: { floors: { where: { deletedAt: null }, include: { units: { where: { deletedAt: null }, include: { occupancies: true } } } } } }, amenities: true, images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } }, documents: { where: { deletedAt: null } }, ownerships: true } }); }
  findAny(propertyId: string, organizationId: string) { return this.prisma.property.findFirst({ where: { id: propertyId, organizationId } }); }
  findBuilding(propertyId: string, buildingId: string, includeDeleted = false) { return this.prisma.building.findFirst({ where: { id: buildingId, propertyId, ...(includeDeleted ? {} : { deletedAt: null }) } }); }
  findFloor(propertyId: string, buildingId: string, floorId: string, includeDeleted = false) { return this.prisma.floor.findFirst({ where: { id: floorId, buildingId, ...(includeDeleted ? {} : { deletedAt: null }), building: { propertyId } } }); }
  findUnit(propertyId: string, buildingId: string, floorId: string, unitId: string, includeDeleted = false) { return this.prisma.unit.findFirst({ where: { id: unitId, floorId, ...(includeDeleted ? {} : { deletedAt: null }), floor: { buildingId, building: { propertyId } } } }); }
  listUnits(where: Prisma.UnitWhereInput, skip: number, take: number) { return this.prisma.unit.findMany({ where, skip, take, orderBy: { code: 'asc' }, include: { floor: { include: { building: true } }, occupancies: { where: { endsAt: null }, orderBy: { startsAt: 'desc' }, take: 1 } } }); }
  countUnits(where: Prisma.UnitWhereInput) { return this.prisma.unit.count({ where }); }
  audit(actorUserId: string, organizationId: string, aggregateId: string, action: string, metadata: Prisma.InputJsonObject, tx: Prisma.TransactionClient) { return tx.identityAuditEvent.create({ data: { actorUserId, organizationId, aggregateId, action, metadata } }); }
}
