import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef, TbPageData } from '../types';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('devices')
@ApiSecurity('session-token')
@Controller('devices')
export class DevicesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  @ApiOperation({ summary: "List devices, scoped to caller's customer hierarchy" })
  async list(
    @Query() pagination: PaginationQueryDto,
    @CurrentSession() session: AppSession | null,
  ): Promise<TbPageData<EntityRef>> {
    return this.entitiesService.list('DEVICE', session, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a device by id' })
  @ApiParam({ name: 'id' })
  async getById(@Param('id', ParseTbIdPipe) id: string): Promise<EntityRef> {
    return this.entitiesService.getById(id, 'DEVICE');
  }

  @Post()
  @ApiOperation({ summary: 'Create a device in ThingsBoard (bare — no Client/hierarchy linking)' })
  @ApiResponse({ status: 201, description: 'Device created' })
  async create(@Body() dto: CreateDeviceDto): Promise<EntityRef> {
    return this.entitiesService.createDevice(dto.name, dto.type, dto.label);
  }
}
