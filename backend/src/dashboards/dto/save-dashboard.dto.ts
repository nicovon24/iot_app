import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class WidgetLayoutDto {
  @ApiProperty() @IsNumber() x!: number;
  @ApiProperty() @IsNumber() y!: number;
  @ApiProperty() @IsNumber() w!: number;
  @ApiProperty() @IsNumber() h!: number;
}

class DashboardWidgetInputDto {
  @ApiProperty({ description: 'Widget registry key, e.g. "value-tile" | "line-chart"' })
  @IsString()
  widgetType!: string;

  @ApiProperty({ description: 'Shape depends on widgetType — see widget-registry.ts' })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiProperty({ type: WidgetLayoutDto })
  @ValidateNested()
  @Type(() => WidgetLayoutDto)
  layout!: WidgetLayoutDto;
}

/**
 * Body for both POST /dashboards (create) and PUT /dashboards/:id (whole-dashboard save).
 * The widget list is always the full set, not a delta — DashboardsService replaces every
 * widget row in one transaction per Phase 10's "one save, one transaction" requirement.
 */
export class SaveDashboardDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ enum: ['PRIVATE', 'SHARED'] })
  @IsIn(['PRIVATE', 'SHARED'])
  visibility!: 'PRIVATE' | 'SHARED';

  @ApiProperty({ enum: ['ALL', 'SPECIFIC'] })
  @IsIn(['ALL', 'SPECIFIC'])
  customerScope!: 'ALL' | 'SPECIFIC';

  @ApiPropertyOptional({
    description: 'TB customer ids this dashboard is assigned to. Required when visibility=SHARED and customerScope=SPECIFIC. Ignored otherwise.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  customerIds: string[] = [];

  @ApiPropertyOptional({
    enum: ['SCROLL', 'FIT'],
    description:
      'SCROLL = fixed row height, page scrolls on overflow. FIT = row height derived from the ' +
      'viewport so the whole grid fits with no scrollbar (auto fill layout height).',
  })
  @IsOptional()
  @IsIn(['SCROLL', 'FIT'])
  layoutMode?: 'SCROLL' | 'FIT';

  @ApiPropertyOptional({
    description:
      'Range every timeseries widget on this dashboard reads over. Tagged union: ' +
      '{ kind: "LAST", ms } for a rolling window, or { kind: "FIXED", startTs, endTs } for an ' +
      'absolute one. Omitted = no dashboard-wide window; widgets use their own default. ' +
      'Shape is validated by validateTimeWindow (Zod) before the save transaction opens.',
  })
  @IsOptional()
  @IsObject()
  timeWindow?: Record<string, unknown>;

  @ApiProperty({ type: [DashboardWidgetInputDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => DashboardWidgetInputDto)
  widgets!: DashboardWidgetInputDto[];
}
