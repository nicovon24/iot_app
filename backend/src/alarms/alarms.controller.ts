import { Controller, Get, Param, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AppSession } from '../auth/auth.service';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { EntityType, TbAlarm, TbAlarmSeverity, TbAlarmStatus, TbPageData } from '../types';
import { AlarmsService } from './alarms.service';

const ENTITY_TYPES: EntityType[] = ['DEVICE', 'ASSET', 'CUSTOMER'];
const SEVERITIES: TbAlarmSeverity[] = ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INDETERMINATE'];
const STATUSES: TbAlarmStatus[] = ['ACTIVE_UNACK', 'ACTIVE_ACK', 'CLEARED_UNACK', 'CLEARED_ACK'];

@ApiTags('alarms')
@ApiSecurity('session-token')
@Controller('entities/:id/alarms')
export class EntityAlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Get()
  @ApiOperation({ summary: 'Alarms for a specific entity — scoped by CustomerScopeGuard like any other :id route' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  async getForEntity(
    @Param('id', ParseTbIdPipe) id: string,
    @Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType,
    @Query() pagination: PaginationQueryDto,
  ): Promise<TbPageData<TbAlarm>> {
    return this.alarmsService.getForEntity(id, type, pagination);
  }
}

@ApiTags('alarms')
@ApiSecurity('session-token')
@Controller('alarms')
export class GlobalAlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Get()
  @ApiOperation({
    summary:
      "Global alarm list, scoped to caller's customer hierarchy (TENANT_ADMIN/SYS_ADMIN see the whole tenant). " +
      'Composed from per-entity alarm queries, not a single TB tenant-wide alarm API call.',
  })
  @ApiQuery({ name: 'severity', required: false, enum: SEVERITIES })
  @ApiQuery({ name: 'status', required: false, enum: STATUSES })
  @ApiQuery({
    name: 'entityType',
    required: false,
    enum: ['DEVICE', 'ASSET'],
    description: 'Restrict to alarms originating from devices or from assets. Omitted = both.',
  })
  async getAll(
    @Query() pagination: PaginationQueryDto,
    @CurrentSession() session: AppSession | null,
    @Query('severity') severity?: TbAlarmSeverity,
    @Query('status') status?: TbAlarmStatus,
    @Query('entityType') entityType?: 'DEVICE' | 'ASSET',
  ): Promise<TbPageData<TbAlarm>> {
    return this.alarmsService.getAllScoped(session, pagination, severity, status, entityType);
  }
}
