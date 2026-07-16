import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { RouteOrganizationContextGuard } from '../identity/authorization/route-organization-context.guard';
import { BillingService } from './billing.service';
import { CreateLeaseBillingDto, GenerateRentScheduleDto, SecurityDepositDto, UpdateLeaseBillingDto } from './dto/billing.dto';

@ApiTags('Lease Billing') @ApiBearerAuth('access-token') @UseGuards(AccessTokenGuard, RouteOrganizationContextGuard)
@Controller({ path: 'organizations/:id/leases/:leaseId/billing', version: '1' })
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Post() @ApiOperation({ summary: 'Create the lease billing calendar, rules, and deposit tracker' }) @ApiCreatedResponse()
  create(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Body() dto: CreateLeaseBillingDto, @Req() request: IdentityRequest) { return this.billing.create(request.identity!.sub, organizationId, leaseId, dto); }
  @Get() @ApiOperation({ summary: 'Get billing calendar, escalation, late-fee, and deposit settings' }) @ApiOkResponse()
  get(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Req() request: IdentityRequest) { return this.billing.get(request.identity!.sub, organizationId, leaseId); }
  @Patch() @ApiOperation({ summary: 'Update billing status, due-date policy, proration, or late-fee rule' })
  update(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Body() dto: UpdateLeaseBillingDto, @Req() request: IdentityRequest) { return this.billing.update(request.identity!.sub, organizationId, leaseId, dto); }
  @Patch('security-deposit') @ApiOperation({ summary: 'Update security-deposit tracking without creating a payment' })
  deposit(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Body() dto: SecurityDepositDto, @Req() request: IdentityRequest) { return this.billing.updateDeposit(request.identity!.sub, organizationId, leaseId, dto); }
  @Get('schedules') @ApiOperation({ summary: 'List generated rent schedule rows; these are not invoices' })
  schedules(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Req() request: IdentityRequest) { return this.billing.schedules(request.identity!.sub, organizationId, leaseId); }
  @Post('schedules/generate') @ApiOperation({ summary: 'Generate rent planning schedule rows through a date' })
  generate(@Param('id') organizationId: string, @Param('leaseId') leaseId: string, @Body() dto: GenerateRentScheduleDto, @Req() request: IdentityRequest) { return this.billing.generateSchedules(request.identity!.sub, organizationId, leaseId, dto); }
}
