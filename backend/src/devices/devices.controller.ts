import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef, TbPageData } from '../types';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

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

  @Patch(':id')
  @ApiOperation({ summary: "Update a Device's label" })
  @ApiParam({ name: 'id' })
  async update(@Param('id', ParseTbIdPipe) id: string, @Body() dto: UpdateDeviceDto): Promise<EntityRef> {
    return this.entitiesService.updateDevice(id, dto);
  }
}
