import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { InvitationController } from './invitation.controller';
import { InvitationRepository } from './invitation.repository';
import { InvitationService } from './invitation.service';
import { OrganizationController } from './organization.controller';
import { OrganizationRepository } from './organization.repository';
import { OrganizationService } from './organization.service';
import { OrganizationRoleController } from './role.controller';
import { OrganizationRoleRepository } from './role.repository';
import { OrganizationRoleService } from './role.service';
import { OrganizationSettingsController } from './settings.controller';
import { OrganizationSettingsRepository } from './settings.repository';
import { OrganizationSettingsService } from './settings.service';
import { OrganizationLifecycleController } from './lifecycle.controller';
import { OrganizationLifecycleRepository } from './lifecycle.repository';
import { OrganizationLifecycleService } from './lifecycle.service';
import { OrganizationApprovalController } from './approval.controller';
import { OrganizationApprovalRepository } from './approval.repository';
import { OrganizationApprovalService } from './approval.service';
import { OrganizationComplianceController } from './compliance.controller';
import { OrganizationComplianceRepository } from './compliance.repository';
import { OrganizationComplianceService } from './compliance.service';
import { PortfolioAssignmentController } from './portfolio-assignment.controller';
import { PortfolioAssignmentRepository } from './portfolio-assignment.repository';
import { PortfolioAssignmentService } from './portfolio-assignment.service';
@Module({ imports: [IdentityModule], controllers: [OrganizationController, InvitationController, OrganizationRoleController, OrganizationSettingsController, OrganizationLifecycleController, OrganizationApprovalController, OrganizationComplianceController, PortfolioAssignmentController], providers: [OrganizationRepository, OrganizationService, InvitationRepository, InvitationService, OrganizationRoleRepository, OrganizationRoleService, OrganizationSettingsRepository, OrganizationSettingsService, OrganizationLifecycleRepository, OrganizationLifecycleService, OrganizationApprovalRepository, OrganizationApprovalService, OrganizationComplianceRepository, OrganizationComplianceService, PortfolioAssignmentRepository, PortfolioAssignmentService] })
export class OrganizationModule {}
