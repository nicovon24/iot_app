import { Controller, Get, Param, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { EntityRef, EntityType, TbPageData } from '../types';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

const ENTITY_TYPES: EntityType[] = ['DEVICE', 'ASSET', 'CUSTOMER'];

@ApiTags('entities')
@ApiSecurity('session-token')
@Controller('entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List entities (Device or Asset) unified as EntityRef, scoped to caller\'s customer hierarchy' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  async list(
    @Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType,
    @Query() pagination: PaginationQueryDto,
    @CurrentSession() session: AppSession | null,
  ): Promise<TbPageData<EntityRef>> {
    return this.entitiesService.list(type, session, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single entity by id' })
  @ApiParam({ name: 'id', description: 'ThingsBoard entity id' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  async getById(
    @Param('id', ParseTbIdPipe) id: string,
    @Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType,
  ): Promise<EntityRef> {
    return this.entitiesService.getById(id, type);
  }
}
