import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef, TbPageData } from '../types';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { LinkDeviceDto } from './dto/link-device.dto';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AssetsService } from './assets.service';

@ApiTags('assets')
@ApiSecurity('session-token')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly assetsService: AssetsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List assets, scoped to caller's customer hierarchy" })
  async list(
    @Query() pagination: PaginationQueryDto,
    @CurrentSession() session: AppSession | null,
  ): Promise<TbPageData<EntityRef>> {
    return this.entitiesService.list('ASSET', session, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an asset by id' })
  @ApiParam({ name: 'id' })
  async getById(@Param('id', ParseTbIdPipe) id: string): Promise<EntityRef> {
    return this.entitiesService.getById(id, 'ASSET');
  }

  @Post()
  @ApiOperation({
    summary: 'Create an asset, linked to a Customer hierarchy level',
    description:
      'Creates a new Asset in ThingsBoard and attaches it to the given Customer/level via a real "Contains" relation. ' +
      'customerId + levelIndex must match an existing hierarchy level; parentId is either the Customer (level 0) or an existing Asset one level above.',
  })
  @ApiResponse({ status: 201, description: 'Asset created and linked' })
  @ApiResponse({ status: 400, description: 'Invalid levelIndex or parent/level mismatch' })
  @ApiResponse({ status: 404, description: 'parentId is not a tracked hierarchy member' })
  async create(@Body() dto: CreateAssetDto): Promise<EntityRef> {
    return this.assetsService.create(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete an Asset',
    description: 'Blocked if the Asset still has child Assets or linked Devices — remove those first.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Asset still has children (Assets or Devices)' })
  async delete(@Param('id', ParseTbIdPipe) id: string): Promise<void> {
    await this.assetsService.delete(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an Asset\'s name/type/label' })
  @ApiParam({ name: 'id' })
  async update(@Param('id', ParseTbIdPipe) id: string, @Body() dto: UpdateAssetDto): Promise<EntityRef> {
    return this.assetsService.update(id, dto);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Direct children of this Asset via real TB Contains relations, split by type' })
  @ApiParam({ name: 'id' })
  async getChildren(@Param('id', ParseTbIdPipe) id: string): Promise<{ assets: EntityRef[]; devices: EntityRef[] }> {
    return this.entitiesService.getRelationChildren(id, 'ASSET');
  }

  @Post(':id/devices')
  @ApiOperation({
    summary: 'Link an existing Device to this Asset via a real TB Contains relation',
    description:
      "Scoped: both the Asset and the Device must already be within the caller's own customer hierarchy " +
      '(Customer Users only) — 403 otherwise. Tenant admins bypass this and may link any Device, including ' +
      'one never assigned to a Customer. A Customer User must claim an unassigned Device first (POST /devices/:id/claim).',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 201 })
  @HttpCode(201)
  async linkDevice(
    @Param('id', ParseTbIdPipe) id: string,
    @Body() dto: LinkDeviceDto,
    @CurrentSession() session: AppSession | null,
  ): Promise<void> {
    await this.assetsService.linkDevice(id, dto.deviceId, session);
  }

  @Delete(':id/devices/:deviceId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Unlink a Device from this Asset (removes the Contains relation, does not delete the Device)' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'deviceId' })
  async unlinkDevice(
    @Param('id', ParseTbIdPipe) id: string,
    @Param('deviceId', ParseTbIdPipe) deviceId: string,
    @CurrentSession() session: AppSession | null,
  ): Promise<void> {
    await this.assetsService.unlinkDevice(id, deviceId, session);
  }
}
