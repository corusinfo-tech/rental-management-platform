import { Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { OrganizationLifecycleService } from './lifecycle.service';

@ApiTags('Organization lifecycle') @ApiBearerAuth() @UseGuards(AccessTokenGuard)
@Controller({ path: 'organizations', version: '1' })
export class OrganizationLifecycleController {
  constructor(private readonly lifecycle: OrganizationLifecycleService) {}
  @Post(':id/activate') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Transition a SUSPENDED or ARCHIVED organization to ACTIVE; pending organizations require administrative approval' }) @ApiOkResponse()
  activate(@Param('id') organizationId: string, @Req() request: IdentityRequest) { return this.lifecycle.activate(request.identity!.sub, organizationId); }
  @Post(':id/suspend') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Transition an ACTIVE organization to SUSPENDED' }) @ApiOkResponse()
  suspend(@Param('id') organizationId: string, @Req() request: IdentityRequest) { return this.lifecycle.suspend(request.identity!.sub, organizationId); }
  @Post(':id/archive') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Soft-archive an ACTIVE organization' }) @ApiOkResponse()
  archive(@Param('id') organizationId: string, @Req() request: IdentityRequest) { return this.lifecycle.archive(request.identity!.sub, organizationId); }
  @Post(':id/restore') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Restore an ARCHIVED organization to ACTIVE' }) @ApiOkResponse()
  restore(@Param('id') organizationId: string, @Req() request: IdentityRequest) { return this.lifecycle.restore(request.identity!.sub, organizationId); }
}
