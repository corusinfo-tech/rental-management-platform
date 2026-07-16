import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { RouteOrganizationContextGuard } from '../identity/authorization/route-organization-context.guard';
import { CreateCreditNoteDto, CreateInvoiceDto, InvoiceQueryDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { InvoiceService } from './invoice.service';

@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, RouteOrganizationContextGuard)
@Controller({ path: 'organizations/:id/invoices', version: '1' })
export class InvoiceController {
  constructor(private readonly invoices: InvoiceService) {}

  @Post() @ApiOperation({ summary: 'Generate one invoice from an existing lease rent schedule' }) @ApiCreatedResponse()
  create(@Param('id') organizationId: string, @Body() dto: CreateInvoiceDto, @Req() request: IdentityRequest) { return this.invoices.create(request.identity!.sub, organizationId, dto); }

  @Get() @ApiOperation({ summary: 'Search, filter, and paginate organization invoices' }) @ApiOkResponse()
  list(@Param('id') organizationId: string, @Query() query: InvoiceQueryDto, @Req() request: IdentityRequest) { return this.invoices.list(request.identity!.sub, organizationId, query); }

  @Get(':invoiceId') @ApiOperation({ summary: 'Get invoice lines, rent schedule, and credit notes' }) @ApiOkResponse()
  find(@Param('id') organizationId: string, @Param('invoiceId') invoiceId: string, @Req() request: IdentityRequest) { return this.invoices.find(request.identity!.sub, organizationId, invoiceId); }

  @Patch(':invoiceId') @ApiOperation({ summary: 'Update allowed invoice metadata or non-payment status' })
  update(@Param('id') organizationId: string, @Param('invoiceId') invoiceId: string, @Body() dto: UpdateInvoiceDto, @Req() request: IdentityRequest) { return this.invoices.update(request.identity!.sub, organizationId, invoiceId, dto); }

  @Post(':invoiceId/credit-notes') @ApiOperation({ summary: 'Create a draft or issued credit-note foundation record' }) @ApiCreatedResponse()
  creditNote(@Param('id') organizationId: string, @Param('invoiceId') invoiceId: string, @Body() dto: CreateCreditNoteDto, @Req() request: IdentityRequest) { return this.invoices.createCreditNote(request.identity!.sub, organizationId, invoiceId, dto); }

  @Delete(':invoiceId') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Soft-delete an invoice while preserving its prior status' })
  archive(@Param('id') organizationId: string, @Param('invoiceId') invoiceId: string, @Req() request: IdentityRequest) { return this.invoices.archive(request.identity!.sub, organizationId, invoiceId); }

  @Post(':invoiceId/restore') @ApiOperation({ summary: 'Restore a soft-deleted invoice to its prior status' })
  restore(@Param('id') organizationId: string, @Param('invoiceId') invoiceId: string, @Req() request: IdentityRequest) { return this.invoices.restore(request.identity!.sub, organizationId, invoiceId); }
}
