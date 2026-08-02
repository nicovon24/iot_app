import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef, TbPageData } from '../types';
import { CreateAssetDto } from './dto/create-asset.dto';
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
}
