'use client';

import { AlertTriangle, Flame, MapPin, MapPinned } from 'lucide-react';
import { LabelWidget } from '@/widgets';
import { MultiKeyChartWidget } from '@/widgets';
import { groupKeysByUnit } from '@/lib';
import { CalendarHeatmapWidget } from '@/widgets';
import { ValueTileWidget } from '@/widgets';
import { ValueCardsWidget } from '@/widgets';
import { GaugeWidget } from '@/widgets';
import { BatteryWidget } from '@/widgets';
import { RssiWidget } from '@/widgets';
import { CountTileWidget } from '@/widgets';
import { LineChartWidget } from '@/widgets';
import { BarChartWidget } from '@/widgets';
import { ScatterChartWidget } from '@/widgets';
import { DonutChartWidget } from '@/widgets';
import { EntityDataTableWidget } from '@/widgets';
import { TimeseriesTableWidget } from '@/widgets';
import { AlarmsListWidget } from '@/widgets';
import type { Alarm } from '@/types';
import type { WidgetType } from './widget-registry';

const NOW = Date.now();

const MOCK_LINE_DATA = Array.from({ length: 12 }, (_, i) => ({
  ts: NOW - (11 - i) * 60_000,
  value: 20 + Math.sin(i / 2) * 4 + i * 0.3,
}));

/** ~3 years of daily values with a seasonal swing, so the preview shows what the year-per-row
 * layout is for: the same season sits in the same column across rows. */
const MOCK_CALENDAR_DATA = Array.from({ length: 1000 }, (_, i) => {
  const ts = NOW - (999 - i) * 86_400_000;
  const seasonal = Math.sin((i / 365) * Math.PI * 2) * 30;
  return { ts, value: 50 + seasonal + (i % 11) * 2 };
});

/** Correlated pair with scatter — the shape a real rssi/snr relationship has, so the preview
 * shows what the chart is for rather than a random cloud. */
const MOCK_SCATTER_DATA = Array.from({ length: 60 }, (_, i) => {
  const x = -100 + (i / 59) * 55;
  return { x, y: 30 + (x + 100) * 0.35 + (Math.sin(i * 2.4) * 4) };
});

/** Two synthetic series with different units — demonstrates the dual-axis behavior the widget
 * exists for, rather than one flat unitless preview. */
const MOCK_TEMPERATURE_DATA = MOCK_LINE_DATA.map((p) => ({ ts: p.ts, value: String(p.value) }));
const MOCK_PRESSURE_DATA = Array.from({ length: 12 }, (_, i) => ({
  ts: NOW - (11 - i) * 60_000,
  value: String(1.1 + Math.cos(i / 3) * 0.15),
}));

const MOCK_ALARM: Alarm = {
  id: { id: 'preview-alarm', entityType: 'ALARM' },
  type: 'High temperature',
  severity: 'MAJOR',
  status: 'ACTIVE_UNACK',
  originator: { id: 'preview-device', entityType: 'DEVICE' },
  originatorName: 'Pump 003',
  startTs: NOW,
  endTs: 0,
  ackTs: 0,
  clearTs: 0,
};

/** Sample data so each gallery card renders the real widget component instead of a static icon —
 * a live look-alike of what adding the widget produces, ThingsBoard-style. */
export function WidgetPreview({ type }: { type: WidgetType }) {
  switch (type) {
    case 'value-tile':
      return <ValueTileWidget label="Temperature" value="24.6" unit="°C" ts={NOW} />;

    case 'value-cards':
      return (
        <ValueCardsWidget
          entries={[
            { id: '1', name: 'Pump 003', measures: [{ key: 'temperature', value: '24.6', ts: NOW }, { key: 'pressure', value: '1.2', ts: NOW }] },
            { id: '2', name: 'Pump 004', measures: [{ key: 'temperature', value: '22.1', ts: NOW }, { key: 'pressure', value: '1.4', ts: NOW }] },
          ]}
        />
      );

    case 'gauge':
      return <GaugeWidget label="Humidity" value={68} min={0} max={100} unit="%" ts={NOW} />;

    case 'battery':
      return <BatteryWidget label="Battery" value={72} min={0} max={100} unit="%" ts={NOW} />;

    case 'rssi':
      return <RssiWidget label="Signal" value={-65} min={-120} max={-30} unit="dBm" ts={NOW} />;

    case 'line-chart':
      return <LineChartWidget data={MOCK_LINE_DATA} dataKey="temperature" heightClassName="h-full" />;

    case 'bar-chart':
      return <BarChartWidget data={MOCK_LINE_DATA} dataKey="temperature" heightClassName="h-full" />;

    case 'scatter':
      return (
        <ScatterChartWidget
          series={[{ id: '1', name: 'Pump 003', points: MOCK_SCATTER_DATA }]}
          xLabel="rssi"
          yLabel="snr"
          xUnit="dBm"
          yUnit="dB"
        />
      );

    case 'donut':
      return (
        <DonutChartWidget
          slices={[
            { name: 'CRITICAL', value: 3, color: '#dc2626' },
            { name: 'MAJOR', value: 7, color: '#f87171' },
            { name: 'WARNING', value: 12, color: '#f59e0b' },
            { name: 'MINOR', value: 5, color: '#fbbf24' },
          ]}
          unitNoun="alarms"
        />
      );

    case 'attributes-table':
      return (
        <EntityDataTableWidget
          mode="LIST"
          rows={[{ id: '1', name: 'Pump 003' }]}
          columns={[
            { id: 'firmware', label: 'firmware', source: 'ATTRIBUTE', scope: 'SERVER_SCOPE', key: 'firmware' },
            { id: 'temperature', label: 'temperature', source: 'TELEMETRY', key: 'temperature' },
          ]}
          values={{ '1': { firmware: { value: 'v2.3.1' }, temperature: { value: '24.6', ts: NOW } } }}
        />
      );

    case 'timeseries-table':
      return (
        <TimeseriesTableWidget
          keys={['temperature', 'pressure']}
          byKey={{
            temperature: MOCK_LINE_DATA.map((p) => ({ ts: p.ts, value: p.value.toFixed(1) })),
            pressure: MOCK_LINE_DATA.map((p) => ({ ts: p.ts, value: (p.value / 20).toFixed(2) })),
          }}
        />
      );

    case 'alarms-list':
      return <AlarmsListWidget alarms={[MOCK_ALARM]} isLoading={false} isError={false} emptyLabel="No alarms" />;

    case 'alarm-count':
      return <CountTileWidget label="Critical alarms" value={3} accent="danger" icon={AlertTriangle} />;

    case 'calendar-heatmap':
      return <CalendarHeatmapWidget points={MOCK_CALENDAR_DATA} />;

    // The three map widgets all mount Leaflet + network tiles + live hooks per marker — too
    // heavy (and error-prone) with several instances at once in a small gallery grid. A static
    // faux-map gives the same visual idea with no map engine.
    case 'map':
      return <FauxMap icon={MapPin} />;

    case 'value-map':
      return <FauxMap icon={MapPinned} />;

    case 'movement-heatmap':
      return <FauxMap icon={Flame} />;

    case 'label':
      return <LabelWidget text="Section: Pump Station 3" align="left" />;

    case 'multi-key-chart': {
      const keys = ['temperature', 'pressure'];
      const units = { temperature: '°C', pressure: 'bar' };
      const { axes } = groupKeysByUnit(keys, units);
      return (
        <MultiKeyChartWidget
          series={[
            { id: 'temperature', name: 'temperature', points: MOCK_TEMPERATURE_DATA },
            { id: 'pressure', name: 'pressure', points: MOCK_PRESSURE_DATA },
          ]}
          axes={axes}
        />
      );
    }
  }
}

/** Schematic map (coastline + streets) as an inline SVG data URI — a closer stand-in for a real
 * map tile than the old dot-grid, with none of the weight of mounting Leaflet per gallery card. */
const MAP_BACKGROUND_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140" viewBox="0 0 200 140">
  <rect width="200" height="140" fill="#dbeafe"/>
  <path d="M0 90 Q40 60 70 85 T140 70 T200 95 V140 H0 Z" fill="#e0f2fe"/>
  <path d="M0 55 L200 40" stroke="#ffffff" stroke-width="5"/>
  <path d="M30 0 L55 140" stroke="#ffffff" stroke-width="4"/>
  <path d="M150 0 L120 140" stroke="#ffffff" stroke-width="3"/>
  <path d="M0 105 L200 115" stroke="#ffffff" stroke-width="3"/>
</svg>
`);

function FauxMap({ icon: Icon }: { icon: typeof MapPin }) {
  return (
    <div
      className="glass-card relative flex h-full items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url("data:image/svg+xml,${MAP_BACKGROUND_SVG}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Icon size={28} className="text-accent drop-shadow" fill="var(--color-accent)" fillOpacity={0.25} />
    </div>
  );
}
