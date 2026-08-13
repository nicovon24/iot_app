'use client';

import { ValueTileCell, ValueCardsCell, GaugeCell, DialCell } from './CardCells';
import { LineChartCell, BarChartCell, ScatterCell, DonutCell, CalendarHeatmapCell } from './ChartCells';
import { TimeseriesTableCell, AttributesCell } from './TableCells';
import { AlarmsCell, AlarmCountCell } from './AlarmCells';
import { MapCell, ValueMapCell, MovementHeatmapCell } from './MapCells';
import { WidgetUnavailable, type EntityWidgetConfig } from './shared';
import type { DashboardWidget } from '@/types';

export function DashboardWidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const config = widget.config as EntityWidgetConfig;

  switch (widget.widgetType) {
    case 'value-tile':
      return <ValueTileCell config={config} />;
    case 'value-cards':
      return <ValueCardsCell config={config} />;
    case 'gauge':
      return <GaugeCell config={config} />;
    case 'battery':
      return <DialCell config={config} kind="battery" />;
    case 'rssi':
      return <DialCell config={config} kind="rssi" />;
    case 'line-chart':
      return <LineChartCell config={config} />;
    case 'bar-chart':
      return <BarChartCell config={config} />;
    case 'scatter':
      return <ScatterCell config={config} />;
    case 'donut':
      return <DonutCell config={config} />;
    case 'attributes-table':
      return <AttributesCell config={config} />;
    case 'timeseries-table':
      return <TimeseriesTableCell config={config} />;
    case 'alarms-list':
      return <AlarmsCell config={config} />;
    case 'alarm-count':
      return <AlarmCountCell config={config} />;
    case 'calendar-heatmap':
      return <CalendarHeatmapCell config={config} />;
    case 'map':
      return <MapCell config={config} />;
    case 'value-map':
      return <ValueMapCell config={config} />;
    case 'movement-heatmap':
      return <MovementHeatmapCell config={config} />;
    default:
      return <WidgetUnavailable reason={`Unknown widget type: ${widget.widgetType}`} />;
  }
}
