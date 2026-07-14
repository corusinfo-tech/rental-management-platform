import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RouteOrganizationContextGuard } from '../identity/authorization/route-organization-context.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { OrganizationSettingsResponseDto, UpdateOrganizationSettingsDto } from './dto/settings.dto';
import { OrganizationSettingsService } from './settings.service';

@ApiTags('Organization settings') @ApiBearerAuth() @UseGuards(AccessTokenGuard, RouteOrganizationContextGuard, PermissionGuard) @RequirePermissions('organization.settings.manage')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationSettingsController {
  constructor(private readonly settings: OrganizationSettingsService) {}
  @Get(':id/settings') @ApiOperation({ summary: 'Get settings for an organization owned or administered by the caller' }) @ApiOkResponse({ type: OrganizationSettingsResponseDto })
  get(@Param('id') organizationId: string, @Req() request: IdentityRequest) { return this.settings.get(request.identity!.sub, organizationId); }
  @Patch(':id/settings') @ApiOperation({ summary: 'Update settings for an organization owned or administered by the caller' }) @ApiOkResponse({ type: OrganizationSettingsResponseDto })
  update(@Param('id') organizationId: string, @Body() dto: UpdateOrganizationSettingsDto, @Req() request: IdentityRequest) { return this.settings.update(request.identity!.sub, organizationId, dto); }
}
