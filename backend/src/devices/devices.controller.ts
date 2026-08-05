import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
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

  @Post(':id/claim')
  @HttpCode(200)
  @ApiOperation({
    summary: "Claim an unassigned Device into the caller's own Customer",
    description:
      'Customer Users only — assigns a Device ThingsBoard has never given a real Customer owner into the ' +
      "caller's own customer, so it can then be linked to one of that customer's Assets. 403 if called by a " +
      'tenant admin (they assign devices directly via POST /assets/:id/devices instead) or if the caller has ' +
      'no customer scope. 409 if the device already belongs to a customer.',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Caller is not a scoped Customer User' })
  @ApiResponse({ status: 409, description: 'Device already assigned to a customer' })
  async claim(
    @Param('id', ParseTbIdPipe) id: string,
    @CurrentSession() session: AppSession | null,
  ): Promise<EntityRef> {
    return this.entitiesService.claimDevice(id, session);
  }
}
