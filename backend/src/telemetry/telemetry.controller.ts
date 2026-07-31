import { Controller, Get, Param, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntityType, TelemetryLatest, TelemetryValue } from '../types';
import { TelemetryService } from './telemetry.service';

const ENTITY_TYPES: EntityType[] = ['DEVICE', 'ASSET', 'CUSTOMER'];

@ApiTags('telemetry')
@ApiSecurity('session-token')
@Controller('entities/:id/telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('keys')
  @ApiOperation({ summary: 'List available telemetry keys for this entity' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  async getKeys(
    @Param('id') id: string,
    @Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType,
  ): Promise<string[]> {
    return this.telemetryService.getKeys(id, type);
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Latest telemetry values, Redis-cached (~3s TTL). Values are always strings, never JS numbers.',
  })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  @ApiQuery({ name: 'keys', required: false, description: 'Comma-separated keys; omit for all keys' })
  async getLatest(
    @Param('id') id: string,
    @Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType,
    @Query('keys') keys?: string,
  ): Promise<TelemetryLatest> {
    return this.telemetryService.getLatest(id, type, keys ? keys.split(',') : undefined);
  }

  @Get('timeseries')
  @ApiOperation({
    summary:
      'Historical telemetry. Omit "limit" to get everything ThingsBoard would return (no backend-invented cap). ' +
      'Pass "agg" + "interval" (ms) for real bucketed aggregation — e.g. agg=AVG&interval=300000 for a value every 5 minutes. ' +
      'Aggregation is always forwarded to ThingsBoard\'s own aggregation API, never computed locally.',
  })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  @ApiQuery({ name: 'keys', description: 'Comma-separated keys' })
  @ApiQuery({ name: 'startTs', description: 'Unix ms' })
  @ApiQuery({ name: 'endTs', description: 'Unix ms' })
  @ApiQuery({ name: 'agg', required: false, enum: ['MIN', 'MAX', 'AVG', 'SUM', 'COUNT', 'NONE'] })
  @ApiQuery({ name: 'interval', required: false, description: 'Bucket size in ms — required together with "agg"' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max points; omit for ThingsBoard\'s own default (unbounded from this API\'s perspective)' })
  async getTimeseries(
    @Param('id') id: string,
    @Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType,
    @Query('keys') keys: string,
    @Query('startTs') startTs: string,
    @Query('endTs') endTs: string,
    @Query('agg') agg?: string,
    @Query('interval') interval?: string,
    @Query('limit') limit?: string,
  ): Promise<Record<string, TelemetryValue[]>> {
    return this.telemetryService.getTimeseries(id, type, keys.split(','), Number(startTs), Number(endTs), {
      agg,
      intervalMs: interval ? Number(interval) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
