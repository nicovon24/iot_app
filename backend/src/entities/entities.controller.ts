import { Controller, Get, Param, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { EntityRef, EntityType } from '../types';

const ENTITY_TYPES: EntityType[] = ['DEVICE', 'ASSET', 'CUSTOMER'];

@ApiTags('entities')
@ApiSecurity('session-token')
@Controller('entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List entities (Device or Asset) unified as EntityRef' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  async list(@Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType): Promise<EntityRef[]> {
    return this.entitiesService.list(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single entity by id' })
  @ApiParam({ name: 'id', description: 'ThingsBoard entity id' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  async getById(
    @Param('id') id: string,
    @Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType,
  ): Promise<EntityRef> {
    return this.entitiesService.getById(id, type);
  }
}
