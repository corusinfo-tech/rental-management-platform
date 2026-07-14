import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { OrganizationService } from './organization.service';

@ApiTags('Organizations') @ApiBearerAuth() @UseGuards(AccessTokenGuard)
@Controller({ path: 'organizations', version: '1' })
export class OrganizationController {
  constructor(private readonly organizations: OrganizationService) {}
  @Post() @ApiOperation({ summary: 'Create an organization with the authenticated user as its sole owner' }) @ApiCreatedResponse()
  create(@Body() dto: CreateOrganizationDto, @Req() request: IdentityRequest) { return this.organizations.create(request.identity!.sub, dto); }
  @Get(':id') @ApiOperation({ summary: 'Get an organization owned by the authenticated user' }) @ApiOkResponse()
  find(@Param('id') id: string, @Req() request: IdentityRequest) { return this.organizations.findById(request.identity!.sub, id); }
  @Patch(':id') @ApiOperation({ summary: 'Update an organization owned by the authenticated user' }) @ApiOkResponse()
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto, @Req() request: IdentityRequest) { return this.organizations.update(request.identity!.sub, id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Archive an organization owned by the authenticated user' })
  archive(@Param('id') id: string, @Req() request: IdentityRequest) { return this.organizations.archive(request.identity!.sub, id); }
}
