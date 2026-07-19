import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { RouteOrganizationContextGuard } from '../identity/authorization/route-organization-context.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { SetPortfolioAssignmentsDto } from './dto/portfolio-assignment.dto';
import { PortfolioAssignmentService } from './portfolio-assignment.service';

@ApiTags('Organization portfolio assignments')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RouteOrganizationContextGuard, PermissionGuard)
@RequirePermissions('organization.members.manage', 'portfolio.access.all')
@Controller({ path: 'organizations', version: '1' })
export class PortfolioAssignmentController {
  constructor(private readonly assignments: PortfolioAssignmentService) {}

  @Get(':id/members/:membershipId/portfolio-assignments')
  @ApiOperation({ summary: 'List explicit property assignments for an organization membership' })
  @ApiOkResponse()
  list(
    @Param('id') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Req() request: IdentityRequest,
  ) {
    return this.assignments.list(request.identity!.sub, organizationId, membershipId);
  }

  @Put(':id/members/:membershipId/portfolio-assignments')
  @ApiOperation({ summary: 'Replace explicit property assignments for an organization membership' })
  @ApiOkResponse()
  replace(
    @Param('id') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: SetPortfolioAssignmentsDto,
    @Req() request: IdentityRequest,
  ) {
    return this.assignments.replace(request.identity!.sub, organizationId, membershipId, dto);
  }
}
