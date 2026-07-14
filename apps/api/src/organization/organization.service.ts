import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { OrganizationStatus, OrganizationType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { OrganizationRepository } from './organization.repository';
import { OrganizationEvent } from './organization-events';
import { OrganizationLifecycleService } from './lifecycle.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository, private readonly lifecycle: OrganizationLifecycleService) {}
  async create(ownerUserId: string, input: CreateOrganizationDto) { return this.repository.transaction(async (transaction) => { const owner = await this.repository.findUserPerson(ownerUserId, transaction); if (!owner) throw new ForbiddenException(); const organization = await this.repository.create({ code: `org-${randomUUID()}`, name: input.name.trim(), legalName: input.legalName?.trim(), organizationType: input.organizationType as OrganizationType, registrationNumber: input.registrationNumber?.trim(), email: input.email?.trim().toLowerCase(), mobile: input.mobile, status: OrganizationStatus.PENDING }, transaction); await this.repository.createSettings({ organizationId: organization.id, timezone: input.timezone ?? 'UTC', currency: input.currency ?? 'INR', country: input.country ?? 'IN' }, transaction); await this.repository.createCompliance(organization.id, transaction); const membership = await this.repository.createOwnerMembership(organization.id, owner.personId, transaction); const ownerRole = await this.repository.findSystemRole('OWNER', transaction); if (!ownerRole) throw new InternalServerErrorException('Required OWNER role is not configured'); await this.repository.assignRole(membership.id, ownerRole.id, ownerUserId, transaction); const payload = { organizationId: organization.id, ownerUserId, correlationId: null }; if (organization.organizationType === OrganizationType.LANDLORD) { const approval = await this.repository.createApproval(organization.id, transaction); await this.repository.audit(ownerUserId, 'organization.approval.requested', { ...payload, approvalId: approval.id }, transaction); } await this.repository.audit(ownerUserId, 'organization.created', payload, transaction); await this.repository.outbox(OrganizationEvent.Created, organization.id, payload, transaction); return organization; }); }
  async findById(userId: string, id: string) { await this.assertOwner(userId, id); const organization = await this.repository.findById(id); if (!organization) throw new NotFoundException(); return organization; }
  async update(userId: string, id: string, input: UpdateOrganizationDto) { await this.assertOwner(userId, id); return this.repository.transaction(async (transaction) => { const updated = await this.repository.update(id, { ...input, name: input.name?.trim(), email: input.email?.trim().toLowerCase() }, transaction); await this.repository.audit(userId, 'organization.updated', { organizationId: id, correlationId: null }, transaction); return updated; }); }
  async archive(userId: string, id: string) { return this.lifecycle.archive(userId, id); }
  async restore(userId: string, id: string) { return this.lifecycle.restore(userId, id); }
  private async assertOwner(userId: string, organizationId: string) { if (!(await this.repository.ownerMembership(userId, organizationId))) throw new ForbiddenException(); }
}
