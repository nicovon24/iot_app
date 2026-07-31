import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef } from '../types';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';

@ApiTags('devices')
@ApiSecurity('session-token')
@Controller('devices')
export class DevicesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List devices' })
  async list(): Promise<EntityRef[]> {
    return this.entitiesService.list('DEVICE');
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
