import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../identity/authorization/access-token.guard';
import type { IdentityRequest } from '../identity/authorization/request-context';
import { RouteOrganizationContextGuard } from '../identity/authorization/route-organization-context.guard';
import { BulkImportUnitsDto, CreateAmenityDto, CreateBuildingDto, CreateFloorDto, CreatePropertyDocumentDto, CreatePropertyDto, CreatePropertyImageDto, CreateUnitDto, PropertyQueryDto, UnitQueryDto, UpdateBuildingDto, UpdateFloorDto, UpdateOccupancyDto, UpdatePropertyDto, UpdateUnitDto } from './dto/property.dto';
import { PropertyService } from './property.service';

@ApiTags('Properties') @ApiBearerAuth('access-token') @UseGuards(AccessTokenGuard, RouteOrganizationContextGuard)
@Controller({ path: 'organizations/:id/properties', version: '1' })
export class PropertyController {
  constructor(private readonly properties: PropertyService) {}
  @Post() @ApiOperation({ summary: 'Create a property, its address, and optional building/floor/unit hierarchy' }) @ApiCreatedResponse()
  create(@Param('id') organizationId: string, @Body() dto: CreatePropertyDto, @Req() request: IdentityRequest) { return this.properties.create(request.identity!.sub, organizationId, dto); }
  @Get() @ApiOperation({ summary: 'List organization properties with pagination, filtering, search, and sorting' }) @ApiOkResponse()
  list(@Param('id') organizationId: string, @Query() query: PropertyQueryDto, @Req() request: IdentityRequest) { return this.properties.list(request.identity!.sub, organizationId, query); }
  @Get(':propertyId') @ApiOperation({ summary: 'Get a property hierarchy and its media metadata' }) @ApiOkResponse()
  find(@Param('id') organizationId: string, @Param('propertyId') propertyId: string, @Req() request: IdentityRequest) { return this.properties.find(request.identity!.sub, organizationId, propertyId); }
  @Patch(':propertyId') @ApiOperation({ summary: 'Update property metadata or address' }) @ApiOkResponse()
  update(@Param('id') organizationId: string, @Param('propertyId') propertyId: string, @Body() dto: UpdatePropertyDto, @Req() request: IdentityRequest) { return this.properties.update(request.identity!.sub, organizationId, propertyId, dto); }
  @Delete(':propertyId') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Soft-delete a property' })
  archive(@Param('id') organizationId: string, @Param('propertyId') propertyId: string, @Req() request: IdentityRequest) { return this.properties.archive(request.identity!.sub, organizationId, propertyId); }
  @Post(':propertyId/restore') @ApiOperation({ summary: 'Restore a soft-deleted property' })
  restore(@Param('id') organizationId: string, @Param('propertyId') propertyId: string, @Req() request: IdentityRequest) { return this.properties.restore(request.identity!.sub, organizationId, propertyId); }
  @Post(':propertyId/amenities') @ApiOperation({ summary: 'Add a property amenity' })
  amenity(@Param('id') organizationId: string, @Param('propertyId') propertyId: string, @Body() dto: CreateAmenityDto, @Req() request: IdentityRequest) { return this.properties.addAmenity(request.identity!.sub, organizationId, propertyId, dto); }
  @Post(':propertyId/images') @ApiOperation({ summary: 'Register an uploaded property image by storage key' })
  image(@Param('id') organizationId: string, @Param('propertyId') propertyId: string, @Body() dto: CreatePropertyImageDto, @Req() request: IdentityRequest) { return this.properties.addImage(request.identity!.sub, organizationId, propertyId, dto); }
  @Post(':propertyId/documents') @ApiOperation({ summary: 'Register an uploaded property document by storage key' })
  document(@Param('id') organizationId: string, @Param('propertyId') propertyId: string, @Body() dto: CreatePropertyDocumentDto, @Req() request: IdentityRequest) { return this.properties.addDocument(request.identity!.sub, organizationId, propertyId, dto); }
  @Post(':propertyId/buildings') @ApiOperation({ summary: 'Create a building' })
  createBuilding(@Param('id') org: string, @Param('propertyId') propertyId: string, @Body() dto: CreateBuildingDto, @Req() request: IdentityRequest) { return this.properties.createBuilding(request.identity!.sub, org, propertyId, dto); }
  @Patch(':propertyId/buildings/:buildingId') @ApiOperation({ summary: 'Update a building' })
  updateBuilding(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Body() dto: UpdateBuildingDto, @Req() request: IdentityRequest) { return this.properties.updateBuilding(request.identity!.sub, org, propertyId, buildingId, dto); }
  @Delete(':propertyId/buildings/:buildingId') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Soft-delete a building' })
  archiveBuilding(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Req() request: IdentityRequest) { return this.properties.archiveBuilding(request.identity!.sub, org, propertyId, buildingId); }
  @Post(':propertyId/buildings/:buildingId/restore') @ApiOperation({ summary: 'Restore a building' })
  restoreBuilding(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Req() request: IdentityRequest) { return this.properties.archiveBuilding(request.identity!.sub, org, propertyId, buildingId, true); }
  @Post(':propertyId/buildings/:buildingId/floors') @ApiOperation({ summary: 'Create a floor' })
  createFloor(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Body() dto: CreateFloorDto, @Req() request: IdentityRequest) { return this.properties.createFloor(request.identity!.sub, org, propertyId, buildingId, dto); }
  @Patch(':propertyId/buildings/:buildingId/floors/:floorId') @ApiOperation({ summary: 'Update a floor' })
  updateFloor(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Param('floorId') floorId: string, @Body() dto: UpdateFloorDto, @Req() request: IdentityRequest) { return this.properties.updateFloor(request.identity!.sub, org, propertyId, buildingId, floorId, dto); }
  @Delete(':propertyId/buildings/:buildingId/floors/:floorId') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Soft-delete a floor' })
  archiveFloor(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Param('floorId') floorId: string, @Req() request: IdentityRequest) { return this.properties.archiveFloor(request.identity!.sub, org, propertyId, buildingId, floorId); }
  @Post(':propertyId/buildings/:buildingId/floors/:floorId/restore') @ApiOperation({ summary: 'Restore a floor' })
  restoreFloor(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Param('floorId') floorId: string, @Req() request: IdentityRequest) { return this.properties.archiveFloor(request.identity!.sub, org, propertyId, buildingId, floorId, true); }
  @Post(':propertyId/buildings/:buildingId/floors/:floorId/units') @ApiOperation({ summary: 'Create a unit' })
  createUnit(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Param('floorId') floorId: string, @Body() dto: CreateUnitDto, @Req() request: IdentityRequest) { return this.properties.createUnit(request.identity!.sub, org, propertyId, buildingId, floorId, dto); }
  @Post(':propertyId/buildings/:buildingId/floors/:floorId/units/bulk-import') @ApiOperation({ summary: 'Bulk import units into a floor' })
  bulkUnits(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Param('floorId') floorId: string, @Body() dto: BulkImportUnitsDto, @Req() request: IdentityRequest) { return this.properties.bulkImportUnits(request.identity!.sub, org, propertyId, buildingId, floorId, dto); }
  @Get(':propertyId/units') @ApiOperation({ summary: 'Search, filter, sort, and paginate units' })
  units(@Param('id') org: string, @Param('propertyId') propertyId: string, @Query() query: UnitQueryDto, @Req() request: IdentityRequest) { return this.properties.listUnits(request.identity!.sub, org, propertyId, query); }
  @Patch(':propertyId/buildings/:buildingId/floors/:floorId/units/:unitId') @ApiOperation({ summary: 'Update a unit' })
  updateUnit(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Param('floorId') floorId: string, @Param('unitId') unitId: string, @Body() dto: UpdateUnitDto, @Req() request: IdentityRequest) { return this.properties.updateUnit(request.identity!.sub, org, propertyId, buildingId, floorId, unitId, dto); }
  @Patch(':propertyId/buildings/:buildingId/floors/:floorId/units/:unitId/occupancy') @ApiOperation({ summary: 'Record occupancy metadata without creating a lease or tenant' })
  occupancy(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Param('floorId') floorId: string, @Param('unitId') unitId: string, @Body() dto: UpdateOccupancyDto, @Req() request: IdentityRequest) { return this.properties.updateOccupancy(request.identity!.sub, org, propertyId, buildingId, floorId, unitId, dto); }
  @Delete(':propertyId/buildings/:buildingId/floors/:floorId/units/:unitId') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Soft-delete a unit' })
  archiveUnit(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Param('floorId') floorId: string, @Param('unitId') unitId: string, @Req() request: IdentityRequest) { return this.properties.archiveUnit(request.identity!.sub, org, propertyId, buildingId, floorId, unitId); }
  @Post(':propertyId/buildings/:buildingId/floors/:floorId/units/:unitId/restore') @ApiOperation({ summary: 'Restore a unit' })
  restoreUnit(@Param('id') org: string, @Param('propertyId') propertyId: string, @Param('buildingId') buildingId: string, @Param('floorId') floorId: string, @Param('unitId') unitId: string, @Req() request: IdentityRequest) { return this.properties.archiveUnit(request.identity!.sub, org, propertyId, buildingId, floorId, unitId, true); }
}
