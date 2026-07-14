import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, OrganizationStatus, Prisma } from '@prisma/client';
import { OrganizationLifecycleService } from './lifecycle.service';
import { ApprovalVersionDto, OrganizationApprovalResponseDto, RejectOrganizationDto, ReopenOrganizationReviewDto } from './dto/approval.dto';
import { OrganizationApprovalRepository } from './approval.repository';
import { OrganizationEvent } from './organization-events';

@Injectable()
export class OrganizationApprovalService {
  constructor(private readonly repository: OrganizationApprovalRepository, private readonly lifecycle: OrganizationLifecycleService) {}

  async pending(actorUserId: string): Promise<OrganizationApprovalResponseDto[]> {
    return this.repository.transaction(async (transaction) => {
      await this.assertSuperAdmin(actorUserId, transaction);
      return (await this.repository.pending(transaction)).map((approval) => this.response(approval));
    });
  }

  async approve(actorUserId: string, organizationId: string, input: ApprovalVersionDto) {
    return this.repository.transaction(async (transaction) => {
      await this.assertSuperAdmin(actorUserId, transaction);
      const approval = await this.requirePending(organizationId, transaction);
      if (approval.organization.status !== OrganizationStatus.PENDING) throw new ConflictException('Only pending organizations may be approved');
      if (approval.version !== input.expectedVersion || (await this.repository.approve(organizationId, actorUserId, input.expectedVersion, transaction)).count !== 1) throw new ConflictException('Approval changed concurrently');
      await this.lifecycle.activateAfterApproval(actorUserId, organizationId, transaction);
      const payload = { organizationId, approvalId: approval.id, reviewedByUserId: actorUserId };
      await this.repository.audit(actorUserId, 'organization.approved', payload, transaction);
      await this.repository.outbox(OrganizationEvent.Approved, organizationId, payload, transaction);
      return { accepted: true };
    });
  }

  async reject(actorUserId: string, organizationId: string, input: RejectOrganizationDto) {
    return this.repository.transaction(async (transaction) => {
      await this.assertSuperAdmin(actorUserId, transaction);
      const approval = await this.requirePending(organizationId, transaction);
      if (approval.organization.status !== OrganizationStatus.PENDING) throw new ConflictException('Only pending organizations may be rejected');
      if (approval.version !== input.expectedVersion || (await this.repository.reject(organizationId, actorUserId, input.reason.trim(), input.expectedVersion, transaction)).count !== 1) throw new ConflictException('Approval changed concurrently');
      const payload = { organizationId, approvalId: approval.id, reviewedByUserId: actorUserId };
      await this.repository.audit(actorUserId, 'organization.rejected', payload, transaction);
      await this.repository.outbox(OrganizationEvent.Rejected, organizationId, payload, transaction);
      return { accepted: true };
    });
  }

  async reopen(actorUserId: string, organizationId: string, input: ReopenOrganizationReviewDto) {
    return this.repository.transaction(async (transaction) => {
      await this.assertSuperAdmin(actorUserId, transaction);
      const approval = await this.repository.find(organizationId, transaction);
      if (!approval) throw new NotFoundException('Organization approval not found');
      if (approval.status !== ApprovalStatus.REJECTED || approval.organization.status !== OrganizationStatus.PENDING) throw new ConflictException('Only rejected pending organizations may be reopened');
      if (approval.version !== input.expectedVersion || (await this.repository.reopen(organizationId, actorUserId, input.reason?.trim(), input.expectedVersion, transaction)).count !== 1) throw new ConflictException('Approval changed concurrently');
      await this.repository.audit(actorUserId, 'organization.review.reopened', { organizationId, approvalId: approval.id, reviewedByUserId: actorUserId }, transaction);
      return { accepted: true };
    });
  }

  private async assertSuperAdmin(userId: string, transaction: Prisma.TransactionClient) { if (!(await this.repository.platformSuperAdmin(userId, transaction))) throw new ForbiddenException('Platform super administrator access is required'); }
  private async requirePending(organizationId: string, transaction: Prisma.TransactionClient) { const approval = await this.repository.find(organizationId, transaction); if (!approval) throw new NotFoundException('Organization approval not found'); if (approval.status !== ApprovalStatus.PENDING) throw new ConflictException('Organization approval is not pending'); return approval; }
  private response(approval: { id: string; organizationId: string; status: ApprovalStatus; reviewedByUserId: string | null; reviewedAt: Date | null; reason: string | null; createdAt: Date; updatedAt: Date; version: number; organization: { name: string } }): OrganizationApprovalResponseDto { return { id: approval.id, organizationId: approval.organizationId, status: approval.status, reviewedByUserId: approval.reviewedByUserId, reviewedAt: approval.reviewedAt, reason: approval.reason, createdAt: approval.createdAt, updatedAt: approval.updatedAt, version: approval.version, organizationName: approval.organization.name }; }
}
