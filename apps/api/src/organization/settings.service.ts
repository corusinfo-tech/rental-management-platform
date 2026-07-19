import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrganizationSettingsResponseDto, UpdateOrganizationSettingsDto } from './dto/settings.dto';
import { OrganizationSettingsRepository } from './settings.repository';
import { OrganizationEvent } from './organization-events';

@Injectable()
export class OrganizationSettingsService {
  constructor(private readonly repository: OrganizationSettingsRepository) {}

  async get(actorUserId: string, organizationId: string): Promise<OrganizationSettingsResponseDto> {
    return this.repository.transaction(async (transaction) => {
      await this.assertAccess(actorUserId, organizationId, 'organization.settings.read', transaction);
      const settings = await this.repository.findOrCreateDefaults(organizationId, transaction);
      if (!settings) throw new NotFoundException('Organization settings not found');
      return this.response(settings);
    });
  }

  async update(actorUserId: string, organizationId: string, input: UpdateOrganizationSettingsDto): Promise<OrganizationSettingsResponseDto> {
    return this.repository.transaction(async (transaction) => {
      await this.assertAccess(actorUserId, organizationId, 'organization.settings.manage', transaction);
      const current = await this.repository.findOrCreateDefaults(organizationId, transaction);
      if (!current) throw new NotFoundException('Organization settings not found');
      if (current.version !== input.expectedVersion) throw new ConflictException('Organization settings changed concurrently');
      const data = this.normalizedData(input);
      if ((await this.repository.update(organizationId, input.expectedVersion, data, transaction)).count !== 1) throw new ConflictException('Organization settings changed concurrently');
      const settings = await this.repository.findForUpdate(organizationId, transaction);
      if (!settings) throw new NotFoundException('Organization settings not found');
      const changed = Object.keys(data);
      const payload = { organizationId, settingsId: settings.id, changedFields: changed };
      await this.repository.audit(actorUserId, 'organization.settings.updated', payload, transaction);
      await this.repository.outbox(OrganizationEvent.SettingsUpdated, settings.id, organizationId, payload, transaction);
      if (changed.some((field) => ['brandName', 'logoUrl', 'primaryColor', 'secondaryColor'].includes(field))) {
        await this.repository.audit(actorUserId, 'organization.brand.updated', payload, transaction);
        await this.repository.outbox(OrganizationEvent.BrandUpdated, settings.id, organizationId, payload, transaction);
      }
      if (changed.some((field) => ['invoicePrefix', 'invoiceSequence', 'gstEnabled', 'gstNumber'].includes(field))) {
        await this.repository.audit(actorUserId, 'organization.invoice_settings.updated', payload, transaction);
      }
      return this.response(settings);
    });
  }

  private async assertAccess(userId: string, organizationId: string, permissionCode: string, transaction: Prisma.TransactionClient) {
    if (!(await this.repository.settingsAccess(userId, organizationId, permissionCode, transaction))) throw new ForbiddenException('Organization settings permission is required');
  }

  private normalizedData(input: UpdateOrganizationSettingsDto): Prisma.OrganizationSettingsUpdateInput {
    const normalized = {
      timezone: input.timezone,
      dateFormat: input.dateFormat,
      timeFormat: input.timeFormat,
      language: input.language,
      gstEnabled: input.gstEnabled,
      gstNumber: input.gstNumber,
      invoicePrefix: input.invoicePrefix,
      invoiceSequence: input.invoiceSequence,
      brandName: input.brandName,
      logoUrl: input.logoUrl,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      currency: input.currency?.toUpperCase(),
      country: input.country?.toUpperCase(),
      notificationEmail: input.notificationEmail?.trim().toLowerCase(),
      supportEmail: input.supportEmail?.trim().toLowerCase(),
      maintenanceEmail: input.maintenanceEmail?.trim().toLowerCase(),
    };
    return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined)) as Prisma.OrganizationSettingsUpdateInput;
  }

  private response(settings: { id: string; organizationId: string; timezone: string; currency: string; dateFormat: string; timeFormat: string; language: string; country: string; gstEnabled: boolean; gstNumber: string | null; invoicePrefix: string; invoiceSequence: number; brandName: string | null; logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null; notificationEmail: string | null; supportEmail: string | null; maintenanceEmail: string | null; createdAt: Date; updatedAt: Date; version: number }): OrganizationSettingsResponseDto {
    return { ...settings };
  }
}
