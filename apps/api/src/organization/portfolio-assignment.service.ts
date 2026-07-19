import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PortfolioAccessService,
  PortfolioPermission,
} from '../identity/authorization/portfolio-access.service';
import { SetPortfolioAssignmentsDto } from './dto/portfolio-assignment.dto';
import { PortfolioAssignmentRepository } from './portfolio-assignment.repository';

@Injectable()
export class PortfolioAssignmentService {
  constructor(
    private readonly repository: PortfolioAssignmentRepository,
    private readonly access: PortfolioAccessService,
  ) {}

  async list(actorUserId: string, organizationId: string, membershipId: string) {
    await this.assertOrganizationWide(actorUserId, organizationId);
    return this.repository.list(organizationId, membershipId);
  }

  async replace(
    actorUserId: string,
    organizationId: string,
    membershipId: string,
    input: SetPortfolioAssignmentsDto,
  ) {
    await this.assertOrganizationWide(actorUserId, organizationId);
    return this.repository.transaction(async (transaction) => {
      if (!(await this.repository.targetMembership(organizationId, membershipId, transaction)))
        throw new NotFoundException('Active organization membership not found');
      const properties = await this.repository.properties(
        organizationId,
        input.propertyIds,
        transaction,
      );
      if (properties.length !== input.propertyIds.length)
        throw new NotFoundException('One or more properties are outside the organization');
      await transaction.propertyPortfolioAssignment.updateMany({
        where: {
          organizationId,
          membershipId,
          revokedAt: null,
          propertyId: { notIn: input.propertyIds },
        },
        data: { revokedAt: new Date() },
      });
      for (const propertyId of input.propertyIds) {
        await transaction.propertyPortfolioAssignment.upsert({
          where: { membershipId_propertyId: { membershipId, propertyId } },
          create: { organizationId, membershipId, propertyId, assignedByUserId: actorUserId },
          update: {
            organizationId,
            revokedAt: null,
            assignedByUserId: actorUserId,
            assignedAt: new Date(),
          },
        });
      }
      await this.repository.audit(
        actorUserId,
        organizationId,
        membershipId,
        input.propertyIds,
        transaction,
      );
      return { membershipId, propertyIds: input.propertyIds };
    });
  }

  private async assertOrganizationWide(userId: string, organizationId: string) {
    const scope = await this.access.scope(
      userId,
      organizationId,
      PortfolioPermission.PropertyManage,
    );
    if (!scope.permissionCodes.includes('organization.members.manage') || !scope.organizationWide) {
      throw new ForbiddenException('Organization-wide portfolio assignment permission is required');
    }
  }
}
