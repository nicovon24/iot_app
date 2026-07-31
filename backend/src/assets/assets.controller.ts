import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef } from '../types';
import { CreateAssetDto } from './dto/create-asset.dto';

@ApiTags('assets')
@ApiSecurity('session-token')
@Controller('assets')
export class AssetsController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List assets' })
  async list(): Promise<EntityRef[]> {
    return this.entitiesService.list('ASSET');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an asset by id' })
  @ApiParam({ name: 'id' })
  async getById(@Param('id') id: string): Promise<EntityRef> {
    return this.entitiesService.getById(id, 'ASSET');
  }

  @Post()
  @ApiOperation({ summary: 'Create an asset in ThingsBoard (bare — no Client/hierarchy linking)' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  async create(@Body() dto: CreateAssetDto): Promise<EntityRef> {
    return this.entitiesService.createAsset(dto.name, dto.type, dto.label);
  }
}
