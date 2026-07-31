import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef, TbPageData } from '../types';
import { CreateAssetDto } from './dto/create-asset.dto';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('assets')
@ApiSecurity('session-token')
@Controller('assets')
export class AssetsController {
  constructor(private readonly entitiesService: EntitiesService) {}

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
  @ApiOperation({ summary: 'Create an asset in ThingsBoard (bare — no Client/hierarchy linking)' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  async create(@Body() dto: CreateAssetDto): Promise<EntityRef> {
    return this.entitiesService.createAsset(dto.name, dto.type, dto.label);
  }
}
