import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PortfolioAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }
  targetMembership(
    organizationId: string,
    membershipId: string,
    transaction: Prisma.TransactionClient,
  ) {
    return transaction.organizationMembership.findFirst({
      where: { id: membershipId, organizationId, status: MembershipStatus.ACTIVE, deletedAt: null },
    });
  }
  properties(organizationId: string, propertyIds: string[], transaction: Prisma.TransactionClient) {
    return transaction.property.findMany({
      where: { id: { in: propertyIds }, organizationId, deletedAt: null },
      select: { id: true },
    });
  }
  list(organizationId: string, membershipId: string) {
    return this.prisma.propertyPortfolioAssignment.findMany({
      where: { organizationId, membershipId, revokedAt: null },
      select: { id: true, propertyId: true, assignedAt: true, assignedByUserId: true },
      orderBy: { assignedAt: 'asc' },
    });
  }
  audit(
    actorUserId: string,
    organizationId: string,
    membershipId: string,
    propertyIds: string[],
    transaction: Prisma.TransactionClient,
  ) {
    return transaction.identityAuditEvent.create({
      data: {
        actorUserId,
        organizationId,
        aggregateId: membershipId,
        action: 'organization.portfolio_assignments.replaced',
        metadata: { membershipId, propertyIds },
      },
    });
  }
}
