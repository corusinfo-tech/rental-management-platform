import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrganizationComplianceResponseDto, UpdateOrganizationComplianceDto } from './dto/compliance.dto';
import { OrganizationComplianceRepository } from './compliance.repository';
import { OrganizationEvent } from './organization-events';

@Injectable()
export class OrganizationComplianceService {
  constructor(private readonly repository: OrganizationComplianceRepository) {}
  async get(actorUserId: string, organizationId: string): Promise<OrganizationComplianceResponseDto> {
    return this.repository.transaction(async (transaction) => {
      await this.assertSuperAdmin(actorUserId, transaction);
      const compliance = await this.repository.find(organizationId, transaction);
      if (!compliance) throw new NotFoundException('Organization compliance record not found');
      return this.response(compliance);
    });
  }
  async update(actorUserId: string, organizationId: string, input: UpdateOrganizationComplianceDto): Promise<OrganizationComplianceResponseDto> {
    return this.repository.transaction(async (transaction) => {
      await this.assertSuperAdmin(actorUserId, transaction);
      const current = await this.repository.find(organizationId, transaction);
      if (!current) throw new NotFoundException('Organization compliance record not found');
      if (current.version !== input.expectedVersion) throw new ConflictException('Organization compliance changed concurrently');
      const data = this.data(input);
      if ((await this.repository.update(organizationId, input.expectedVersion, data, transaction)).count !== 1) throw new ConflictException('Organization compliance changed concurrently');
      const compliance = await this.repository.find(organizationId, transaction);
      if (!compliance) throw new NotFoundException('Organization compliance record not found');
      const changedFields = Object.keys(data);
      const payload = { organizationId, complianceId: compliance.id, changedFields };
      await this.repository.audit(actorUserId, 'organization.compliance.updated', payload, transaction);
      await this.repository.outbox(OrganizationEvent.ComplianceUpdated, compliance.id, organizationId, payload, transaction);
      if (input.riskLevel && input.riskLevel !== current.riskLevel) {
        await this.repository.audit(actorUserId, 'organization.risk.changed', { ...payload, from: current.riskLevel, to: input.riskLevel }, transaction);
        await this.repository.outbox(OrganizationEvent.RiskChanged, compliance.id, organizationId, { ...payload, from: current.riskLevel, to: input.riskLevel }, transaction);
      }
      if (input.nextReviewAt !== undefined && new Date(input.nextReviewAt).getTime() !== current.nextReviewAt?.getTime()) {
        await this.repository.audit(actorUserId, 'organization.review.scheduled', payload, transaction);
      }
      return this.response(compliance);
    });
  }
  private async assertSuperAdmin(userId: string, transaction: Prisma.TransactionClient) { if (!(await this.repository.platformSuperAdmin(userId, transaction))) throw new ForbiddenException('Platform super administrator access is required'); }
  private data(input: UpdateOrganizationComplianceDto): Prisma.OrganizationComplianceUpdateInput {
    const raw = { complianceStatus: input.complianceStatus, kycStatus: input.kycStatus, gstVerificationStatus: input.gstVerificationStatus, lastReviewAt: input.lastReviewAt ? new Date(input.lastReviewAt) : undefined, nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : undefined, riskLevel: input.riskLevel, notes: input.notes };
    return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined)) as Prisma.OrganizationComplianceUpdateInput;
  }
  private response(compliance: { id: string; organizationId: string; complianceStatus: string; kycStatus: string; gstVerificationStatus: string; lastReviewAt: Date | null; nextReviewAt: Date | null; riskLevel: string; notes: string | null; createdAt: Date; updatedAt: Date; version: number }): OrganizationComplianceResponseDto { return { ...compliance }; }
}
