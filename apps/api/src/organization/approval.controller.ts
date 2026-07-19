import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import { PlatformPrincipalGuard } from '../identity/authorization/platform-principal.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { ApprovalVersionDto, OrganizationApprovalResponseDto, RejectOrganizationDto, ReopenOrganizationReviewDto } from './dto/approval.dto';
import { OrganizationApprovalService } from './approval.service';

@ApiTags('Organization approval') @ApiBearerAuth() @UseGuards(AccessTokenGuard, PlatformPrincipalGuard)
@Controller({ path: 'admin/organizations', version: '1' })
export class OrganizationApprovalController {
  constructor(private readonly approvals: OrganizationApprovalService) {}
  @Get('pending') @ApiOperation({ summary: 'List organization approval requests pending platform-super-admin review' }) @ApiOkResponse({ type: OrganizationApprovalResponseDto, isArray: true })
  pending(@Req() request: IdentityRequest) { return this.approvals.pending(request.identity!.sub); }
  @Post(':id/approve') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Approve a pending organization and activate it through the lifecycle service' }) @ApiOkResponse()
  approve(@Param('id') organizationId: string, @Body() dto: ApprovalVersionDto, @Req() request: IdentityRequest) { return this.approvals.approve(request.identity!.sub, organizationId, dto); }
  @Post(':id/reject') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Reject a pending organization with an administrative reason' }) @ApiOkResponse()
  reject(@Param('id') organizationId: string, @Body() dto: RejectOrganizationDto, @Req() request: IdentityRequest) { return this.approvals.reject(request.identity!.sub, organizationId, dto); }
  @Post(':id/reopen') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Reopen a rejected pending organization for review' }) @ApiOkResponse()
  reopen(@Param('id') organizationId: string, @Body() dto: ReopenOrganizationReviewDto, @Req() request: IdentityRequest) { return this.approvals.reopen(request.identity!.sub, organizationId, dto); }
}
