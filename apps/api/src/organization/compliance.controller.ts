import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { OrganizationComplianceResponseDto, UpdateOrganizationComplianceDto } from './dto/compliance.dto';
import { OrganizationComplianceService } from './compliance.service';

@ApiTags('Organization compliance') @ApiBearerAuth() @UseGuards(AccessTokenGuard)
@Controller({ path: 'admin/organizations', version: '1' })
export class OrganizationComplianceController {
  constructor(private readonly compliance: OrganizationComplianceService) {}
  @Get(':id/compliance') @ApiOperation({ summary: 'Get informational organization compliance data (platform super administrator only)' }) @ApiOkResponse({ type: OrganizationComplianceResponseDto })
  get(@Param('id') organizationId: string, @Req() request: IdentityRequest) { return this.compliance.get(request.identity!.sub, organizationId); }
  @Patch(':id/compliance') @ApiOperation({ summary: 'Update informational organization compliance data (platform super administrator only)' }) @ApiOkResponse({ type: OrganizationComplianceResponseDto })
  update(@Param('id') organizationId: string, @Body() dto: UpdateOrganizationComplianceDto, @Req() request: IdentityRequest) { return this.compliance.update(request.identity!.sub, organizationId, dto); }
}
