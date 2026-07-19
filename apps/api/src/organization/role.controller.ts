import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RouteOrganizationContextGuard } from '../identity/authorization/route-organization-context.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { AssignOrganizationRoleDto, CreateOrganizationRoleDto, OrganizationRoleResponseDto, SetRolePermissionsDto, UpdateOrganizationRoleDto } from './dto/role.dto';
import { OrganizationRoleService } from './role.service';

@ApiTags('Organization roles') @ApiBearerAuth() @UseGuards(AccessTokenGuard, RouteOrganizationContextGuard, PermissionGuard) @RequirePermissions('organization.roles.manage')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationRoleController {
  constructor(private readonly roles: OrganizationRoleService) {}
  @Post(':id/roles') @ApiOperation({ summary: 'Create a custom organization role (role-management permission required)' }) @ApiCreatedResponse({ type: OrganizationRoleResponseDto })
  create(@Param('id') organizationId: string, @Body() dto: CreateOrganizationRoleDto, @Req() request: IdentityRequest) { return this.roles.create(request.identity!.sub, organizationId, dto); }
  @Get(':id/roles') @ApiOperation({ summary: 'List organization and global system roles (role-management permission required)' }) @ApiOkResponse({ type: OrganizationRoleResponseDto, isArray: true })
  list(@Param('id') organizationId: string, @Req() request: IdentityRequest) { return this.roles.list(request.identity!.sub, organizationId); }
  @Patch(':id/roles/:roleId') @ApiOperation({ summary: 'Update a custom organization role (role-management permission required)' }) @ApiOkResponse({ type: OrganizationRoleResponseDto })
  update(@Param('id') organizationId: string, @Param('roleId') roleId: string, @Body() dto: UpdateOrganizationRoleDto, @Req() request: IdentityRequest) { return this.roles.update(request.identity!.sub, organizationId, roleId, dto); }
  @Delete(':id/roles/:roleId') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Soft-delete a custom organization role (role-management permission required)' })
  delete(@Param('id') organizationId: string, @Param('roleId') roleId: string, @Req() request: IdentityRequest) { return this.roles.delete(request.identity!.sub, organizationId, roleId); }
  @Post(':id/roles/:roleId/permissions') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Grant or replace custom-role permissions (role-management permission required)' })
  permissions(@Param('id') organizationId: string, @Param('roleId') roleId: string, @Body() dto: SetRolePermissionsDto, @Req() request: IdentityRequest) { return this.roles.setPermissions(request.identity!.sub, organizationId, roleId, dto); }
  @Post(':id/members/:membershipId/roles') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Assign or remove a role from an organization membership (role-management permission required)' })
  assign(@Param('id') organizationId: string, @Param('membershipId') membershipId: string, @Body() dto: AssignOrganizationRoleDto, @Req() request: IdentityRequest) { return this.roles.assign(request.identity!.sub, organizationId, membershipId, dto); }
}
