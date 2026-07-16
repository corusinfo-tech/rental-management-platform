import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { RouteOrganizationContextGuard } from '../identity/authorization/route-organization-context.guard';
import { CreateLeaseDocumentDto, CreateLeaseDto, LeasePartyDto, LeaseQueryDto, RenewLeaseDto, TerminateLeaseDto, UpdateLeaseDto } from './dto/lease.dto';
import { LeaseService } from './lease.service';

@ApiTags('Leases') @ApiBearerAuth('access-token') @UseGuards(AccessTokenGuard, RouteOrganizationContextGuard)
@Controller({ path: 'organizations/:id/leases', version: '1' })
export class LeaseController {
  constructor(private readonly leases: LeaseService) {}
  @Post() @ApiOperation({ summary: 'Create a draft lease with terms and optional parties' }) @ApiCreatedResponse()
  create(@Param('id') organizationId: string, @Body() dto: CreateLeaseDto, @Req() request: IdentityRequest) { return this.leases.create(request.identity!.sub, organizationId, dto); }
  @Get() @ApiOperation({ summary: 'List organization leases with pagination and filters' }) @ApiOkResponse()
  list(@Param('id') organizationId: string, @Query() query: LeaseQueryDto, @Req() request: IdentityRequest) { return this.leases.list(request.identity!.sub, organizationId, query); }
  @Get(':leaseId') @ApiOperation({ summary: 'Get a lease, its terms, parties, documents, and renewals' }) @ApiOkResponse()
  find(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Req() request: IdentityRequest) { return this.leases.find(request.identity!.sub, organizationId, leaseId); }
  @Patch(':leaseId') @ApiOperation({ summary: 'Update lease status or commercial terms' })
  update(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Body() dto: UpdateLeaseDto, @Req() request: IdentityRequest) { return this.leases.update(request.identity!.sub, organizationId, leaseId, dto); }
  @Post(':leaseId/parties') @ApiOperation({ summary: 'Add a tenant, co-tenant, or guarantor to a lease' })
  party(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Body() dto: LeasePartyDto, @Req() request: IdentityRequest) { return this.leases.addParty(request.identity!.sub, organizationId, leaseId, dto); }
  @Post(':leaseId/documents') @ApiOperation({ summary: 'Register a lease document by object storage key' })
  document(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Body() dto: CreateLeaseDocumentDto, @Req() request: IdentityRequest) { return this.leases.addDocument(request.identity!.sub, organizationId, leaseId, dto); }
  @Post(':leaseId/renew') @ApiOperation({ summary: 'Renew a lease by extending its term' })
  renew(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Body() dto: RenewLeaseDto, @Req() request: IdentityRequest) { return this.leases.renew(request.identity!.sub, organizationId, leaseId, dto); }
  @Post(':leaseId/terminate') @ApiOperation({ summary: 'Record termination notice for a lease' })
  terminate(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Body() dto: TerminateLeaseDto, @Req() request: IdentityRequest) { return this.leases.terminate(request.identity!.sub, organizationId, leaseId, dto); }
  @Delete(':leaseId') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Soft-delete a lease' })
  archive(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Req() request: IdentityRequest) { return this.leases.archive(request.identity!.sub, organizationId, leaseId); }
  @Post(':leaseId/restore') @ApiOperation({ summary: 'Restore a soft-deleted lease as a draft' })
  restore(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Req() request: IdentityRequest) { return this.leases.restore(request.identity!.sub, organizationId, leaseId); }
}
