import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { RouteOrganizationContextGuard } from '../identity/authorization/route-organization-context.guard';
import { ApplyAdvanceDto, CreatePaymentDto, CreateRefundDto, PaymentQueryDto } from './dto/payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, RouteOrganizationContextGuard)
@Controller({ path: 'organizations/:id', version: '1' })
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post('payments') @ApiOperation({ summary: 'Record and allocate a completed payment against existing invoices' }) @ApiCreatedResponse()
  create(@Param('id') organizationId: string, @Body() dto: CreatePaymentDto, @Req() request: IdentityRequest) { return this.payments.create(request.identity!.sub, organizationId, dto); }

  @Get('payments') @ApiOperation({ summary: 'Search, filter, and paginate organization payments' }) @ApiOkResponse()
  list(@Param('id') organizationId: string, @Query() query: PaymentQueryDto, @Req() request: IdentityRequest) { return this.payments.list(request.identity!.sub, organizationId, query); }

  @Get('payments/:paymentId') @ApiOperation({ summary: 'Get payment allocations, receipt, and refund requests' }) @ApiOkResponse()
  find(@Param('id') organizationId: string, @Param('paymentId') paymentId: string, @Req() request: IdentityRequest) { return this.payments.find(request.identity!.sub, organizationId, paymentId); }

  @Post('payments/:paymentId/refunds') @ApiOperation({ summary: 'Reserve a pending refund against a completed payment' }) @ApiCreatedResponse()
  refund(@Param('id') organizationId: string, @Param('paymentId') paymentId: string, @Body() dto: CreateRefundDto, @Req() request: IdentityRequest) { return this.payments.requestRefund(request.identity!.sub, organizationId, paymentId, dto); }

  @Post('payments/:paymentId/allocations') @ApiOperation({ summary: 'Apply an unapplied advance balance to another existing invoice' }) @ApiCreatedResponse()
  allocateAdvance(@Param('id') organizationId: string, @Param('paymentId') paymentId: string, @Body() dto: ApplyAdvanceDto, @Req() request: IdentityRequest) { return this.payments.allocateAdvance(request.identity!.sub, organizationId, paymentId, dto); }

  @Post('invoices/:invoiceId/recalculate-outstanding') @ApiOperation({ summary: 'Recalculate invoice outstanding balance from credits and completed allocations' }) @ApiOkResponse()
  recalculate(@Param('id') organizationId: string, @Param('invoiceId') invoiceId: string, @Req() request: IdentityRequest) { return this.payments.recalculateInvoice(request.identity!.sub, organizationId, invoiceId); }
}
