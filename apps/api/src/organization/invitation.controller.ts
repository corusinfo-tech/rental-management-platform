import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '../core/request/request-context';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RouteOrganizationContextGuard } from '../identity/authorization/route-organization-context.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { CreateOrganizationInvitationDto, InvitationResponseDto, InvitationTokenDto, OrganizationMemberResponseDto, RevokeInvitationDto } from './dto/invitation.dto';
import { InvitationService } from './invitation.service';

@ApiTags('Organization invitations')
@Controller({ path: '', version: '1' })
export class InvitationController {
  constructor(private readonly invitations: InvitationService) {}

  @Post('organizations/:id/invitations')
  @UseGuards(AccessTokenGuard, RouteOrganizationContextGuard, PermissionGuard)
  @RequirePermissions('organization.members.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an organization invitation; only an active organization owner may invite' })
  @ApiCreatedResponse({ type: InvitationResponseDto })
  create(@Param('id') organizationId: string, @Body() dto: CreateOrganizationInvitationDto, @Req() request: IdentityRequest & RequestContext) {
    return this.invitations.invite(request.identity!.sub, organizationId, dto, request.correlationId);
  }

  @Get('organizations/:id/members')
  @UseGuards(AccessTokenGuard, RouteOrganizationContextGuard, PermissionGuard)
  @RequirePermissions('organization.members.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List organization members; only an active organization owner may view members' })
  @ApiOkResponse({ type: OrganizationMemberResponseDto, isArray: true })
  members(@Param('id') organizationId: string, @Req() request: IdentityRequest) {
    return this.invitations.members(request.identity!.sub, organizationId);
  }

  @Delete('invitations/:id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a pending organization invitation; only an active owner may revoke' })
  @ApiOkResponse({ description: 'Invitation revoked.' })
  revoke(@Param('id') invitationId: string, @Body() dto: RevokeInvitationDto, @Req() request: IdentityRequest & RequestContext) {
    return this.invitations.revoke(request.identity!.sub, invitationId, dto.expectedVersion, request.correlationId);
  }

  @Post('invitations/:verificationId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation using its existing opaque verification token' })
  @ApiAcceptedResponse({ description: 'Generic accepted response.' })
  accept(@Param('verificationId') verificationId: string, @Body() dto: InvitationTokenDto, @Req() request: RequestContext) {
    return this.invitations.accept(verificationId, dto.token, dto.expectedVersion, request.correlationId);
  }

  @Post('invitations/:verificationId/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline an invitation using its existing opaque verification token' })
  @ApiAcceptedResponse({ description: 'Generic accepted response.' })
  decline(@Param('verificationId') verificationId: string, @Body() dto: InvitationTokenDto, @Req() request: RequestContext) {
    return this.invitations.decline(verificationId, dto.token, dto.expectedVersion, request.correlationId);
  }
}
