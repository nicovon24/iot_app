import type {
  Alarm,
  Dashboard,
  DashboardWidget,
  EntityRef,
  PageData,
  SaveDashboardInput,
  TelemetryLatest,
  TelemetryValue,
} from '@/types';
import { DEMO_DATA_KEY } from './demo-session';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type DraftWidget = Pick<DashboardWidget, 'widgetType' | 'config' | 'layout'>;
type DemoDraft = {
  title: string;
  message: string;
  widgets: DraftWidget[];
  conversationId: string;
  remainingRequests: number;
};
type DemoConversation = {
  id: string;
  title: string;
  updatedAt: string;
  dashboardId: string | null;
  connectionId: string;
  messages: { id: string; role: 'USER' | 'ASSISTANT'; content: string }[];
  draft: DemoDraft | null;
};
type DemoState = {
  dashboards: Dashboard[];
  conversations: DemoConversation[];
  limits: { dailyRequests: number; maxOutputTokens: number };
};

const DEMO_CONNECTION_ID = 'demo-local-simulator';
const customer = (id: string, name: string): EntityRef => ({ id, type: 'CUSTOMER', name });
const CUSTOMERS: EntityRef[] = [
  customer('demo-customer-norte', 'North Plant'),
  customer('demo-customer-sur', 'South Plant'),
];
const customerLink = (id: string) => ({
  id,
  name: CUSTOMERS.find((item) => item.id === id)?.name,
});
const ASSETS: EntityRef[] = [
  {
    id: 'demo-asset-norte',
    type: 'ASSET',
    name: 'Pump Room',
    label: 'Sector A',
    customerId: customerLink(CUSTOMERS[0].id),
  },
  {
    id: 'demo-asset-sur',
    type: 'ASSET',
    name: 'Reserve Tanks',
    label: 'Sector B',
    customerId: customerLink(CUSTOMERS[1].id),
  },
];
const DEVICES: EntityRef[] = [
  {
    id: 'demo-device-01',
    type: 'DEVICE',
    name: 'Main Pump 01',
    label: 'Centrifugal pump',
    customerId: customerLink(CUSTOMERS[0].id),
  },
  {
    id: 'demo-device-02',
    type: 'DEVICE',
    name: 'Temperature Sensor 02',
    label: 'Temperature',
    customerId: customerLink(CUSTOMERS[0].id),
  },
  {
    id: 'demo-device-03',
    type: 'DEVICE',
    name: 'Pressure Meter 03',
    label: 'Line pressure',
    customerId: customerLink(CUSTOMERS[0].id),
  },
  {
    id: 'demo-device-04',
    type: 'DEVICE',
    name: 'South Tank 04',
    label: 'Level and environment',
    customerId: customerLink(CUSTOMERS[1].id),
  },
  {
    id: 'demo-device-05',
    type: 'DEVICE',
    name: 'Remote Station 05',
    label: 'Remote telemetry',
    customerId: customerLink(CUSTOMERS[1].id),
  },
];
const USERS: EntityRef[] = [
  {
    id: 'demo-user-01',
    type: 'CUSTOMER',
    name: 'operator.north@demo.iotarg',
    customerId: customerLink(CUSTOMERS[0].id),
    additionalInfo: { appRole: 'ADMIN' },
  },
  {
    id: 'demo-user-02',
    type: 'CUSTOMER',
    name: 'reader.south@demo.iotarg',
    customerId: customerLink(CUSTOMERS[1].id),
    additionalInfo: { appRole: 'READER' },
  },
];
const DEVICE_ASSET: Record<string, string> = {
  'demo-device-01': ASSETS[0].id,
  'demo-device-02': ASSETS[0].id,
  'demo-device-03': ASSETS[0].id,
  'demo-device-04': ASSETS[1].id,
  'demo-device-05': ASSETS[1].id,
};
const BASE_VALUES = [
  {
    temperature: 68.4,
    humidity: 42,
    pressure: 3.8,
    battery: 91,
    rssi: -62,
    latitude: -34.581,
    longitude: -58.406,
  },
  {
    temperature: 24.6,
    humidity: 48,
    pressure: 2.9,
    battery: 86,
    rssi: -67,
    latitude: -34.583,
    longitude: -58.409,
  },
  {
    temperature: 31.2,
    humidity: 45,
    pressure: 4.2,
    battery: 78,
    rssi: -71,
    latitude: -34.58,
    longitude: -58.402,
  },
  {
    temperature: 21.9,
    humidity: 57,
    pressure: 2.4,
    battery: 83,
    rssi: -68,
    latitude: -34.595,
    longitude: -58.392,
  },
  {
    temperature: 27.1,
    humidity: 39,
    pressure: 3.1,
    battery: 72,
    rssi: -75,
    latitude: -34.601,
    longitude: -58.397,
  },
];
const ALARMS: Alarm[] = [
  {
    id: { id: 'demo-alarm-01', entityType: 'ALARM' },
    type: 'High temperature',
    name: 'High temperature',
    severity: 'MAJOR',
    status: 'ACTIVE_UNACK',
    originator: { id: DEVICES[0].id, entityType: 'DEVICE' },
    originatorName: DEVICES[0].name,
    startTs: Date.now() - 18 * 60_000,
    endTs: 0,
    ackTs: 0,
    clearTs: 0,
  },
  {
    id: { id: 'demo-alarm-02', entityType: 'ALARM' },
    type: 'Low battery',
    name: 'Low battery',
    severity: 'WARNING',
    status: 'ACTIVE_ACK',
    originator: { id: DEVICES[4].id, entityType: 'DEVICE' },
    originatorName: DEVICES[4].name,
    startTs: Date.now() - 92 * 60_000,
    endTs: 0,
    ackTs: Date.now() - 60 * 60_000,
    clearTs: 0,
  },
];
const DEMO_WIDGETS: DraftWidget[] = [
  {
    widgetType: 'attributes-table',
    config: {
      title: 'Temperature across all devices',
      entityType: 'DEVICE',
      entityScope: 'ALL',
      dataKeys: [
        { source: 'TELEMETRY', key: 'temperature' },
        { source: 'TELEMETRY', key: 'battery' },
      ],
    },
    layout: { x: 0, y: 0, w: 7, h: 4 },
  },
  {
    widgetType: 'line-chart',
    config: {
      title: 'Temperature · last 24 hours',
      entityType: 'DEVICE',
      entityScope: 'ALL',
      telemetryKey: 'temperature',
      agg: 'AVG',
    },
    layout: { x: 7, y: 0, w: 5, h: 4 },
  },
  {
    widgetType: 'map',
    config: { title: 'Fleet locations', entityType: 'DEVICE', entityScope: 'ALL' },
    layout: { x: 0, y: 4, w: 7, h: 4 },
  },
  {
    widgetType: 'alarms-list',
    config: { title: 'Recent alarms' },
    layout: { x: 7, y: 4, w: 5, h: 4 },
  },
];

function asDashboard(id: string, input: SaveDashboardInput): Dashboard {
  return {
    id,
    title: input.title,
    createdBy: 'demo-user',
    createdAt: new Date().toISOString(),
    visibility: input.visibility,
    customerScope: input.customerScope,
    timeWindow: input.timeWindow ?? { kind: 'LAST', ms: 86_400_000 },
    layoutMode: input.layoutMode ?? 'SCROLL',
    customerAccess: input.customerIds.map((customerId) => ({
      id: `demo-access-${customerId}`,
      dashboardId: id,
      customerId,
    })),
    widgets: input.widgets.map((widget, index) => ({
      ...widget,
      id: `${id}-widget-${index}`,
      dashboardId: id,
    })),
  };
}

function initialState(): DemoState {
  return {
    dashboards: [
      asDashboard('demo-fleet-dashboard', {
        title: 'Fleet operations',
        visibility: 'SHARED',
        customerScope: 'ALL',
        customerIds: [],
        widgets: DEMO_WIDGETS,
      }),
    ],
    conversations: [],
    limits: { dailyRequests: 20, maxOutputTokens: 2000 },
  };
}

function readState(): DemoState {
  const raw = window.sessionStorage.getItem(DEMO_DATA_KEY);
  if (!raw) return initialState();
  try {
    return JSON.parse(raw) as DemoState;
  } catch {
    return initialState();
  }
}

function writeState(state: DemoState): void {
  window.sessionStorage.setItem(DEMO_DATA_KEY, JSON.stringify(state));
}

function page<T>(items: T[], query: URLSearchParams): PageData<T> {
  const pageNumber = Math.max(0, Number(query.get('page')) || 0);
  const pageSize = Math.max(1, Number(query.get('pageSize')) || 20);
  const start = pageNumber * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    totalPages: Math.ceil(items.length / pageSize),
    totalElements: items.length,
    hasNext: start + pageSize < items.length,
  };
}

function entity(id: string): EntityRef | undefined {
  return [...DEVICES, ...ASSETS, ...CUSTOMERS].find((item) => item.id === id);
}

function telemetry(id: string): TelemetryLatest {
  const index = DEVICES.findIndex((item) => item.id === id);
  const base = BASE_VALUES[index < 0 ? (id === ASSETS[1].id ? 3 : 0) : index];
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [key, { value: String(value), ts: now - 10_000 }]),
  );
}

function timeseries(id: string, query: URLSearchParams): Record<string, TelemetryValue[]> {
  const keys = (query.get('keys') ?? 'temperature').split(',').filter(Boolean);
  const end = Number(query.get('endTs')) || Date.now();
  const start = Number(query.get('startTs')) || end - 86_400_000;
  const points = 24;
  const current = telemetry(id);
  return Object.fromEntries(
    keys.map((key) => [
      key,
      Array.from({ length: points }, (_, i) => ({
        ts: start + Math.round(((end - start) * i) / (points - 1)),
        value: String(
          Number((Number(current[key]?.value ?? 0) + Math.sin(i / 3) * 2.1).toFixed(2)),
        ),
      })),
    ]),
  );
}

function draftForPrompt(prompt: string): { title: string; widgets: DraftWidget[] } {
  const lower = prompt.toLowerCase();
  const key = /presi[oó]n|pressure/.test(lower)
    ? 'pressure'
    : /bater[ií]a|battery/.test(lower)
      ? 'battery'
      : /humedad|humidity/.test(lower)
        ? 'humidity'
        : 'temperature';
  const label = {
    temperature: 'Temperature',
    pressure: 'Pressure',
    battery: 'Battery',
    humidity: 'Humidity',
  }[key];
  const title = `Fleet ${label.toLowerCase()}`;
  const shared = { title, entityType: 'DEVICE' as const };
  const widget: DraftWidget = /tabla|table|listado/.test(lower)
    ? {
        widgetType: 'attributes-table',
        config: { ...shared, entityScope: 'ALL', dataKeys: [{ source: 'TELEMETRY', key }] },
        layout: { x: 0, y: 0, w: 8, h: 4 },
      }
    : /mapa|map/.test(lower)
      ? {
          widgetType: 'map',
          config: { ...shared, entityScope: 'ALL' },
          layout: { x: 0, y: 0, w: 8, h: 4 },
        }
      : /indicador|gauge|medidor/.test(lower)
        ? {
            widgetType: 'gauge',
            config: { ...shared, entityId: DEVICES[0].id, telemetryKey: key },
            layout: { x: 0, y: 0, w: 4, h: 3 },
          }
        : {
            widgetType: 'line-chart',
            config: { ...shared, entityScope: 'ALL', telemetryKey: key, agg: 'AVG' },
            layout: { x: 0, y: 0, w: 8, h: 4 },
          };
  return { title, widgets: [widget] };
}

function generate(state: DemoState, body: unknown): DemoDraft {
  const input = (body ?? {}) as Record<string, unknown>;
  const prompt = String(input.prompt ?? '').trim();
  if (prompt.length < 3) throw new Error('Describe the dashboard you want to create.');
  const existing = state.conversations.find((item) => item.id === input.conversationId);
  const proposal = draftForPrompt(prompt);
  const baseDraft = input.baseDraft as { title?: string; widgets?: DraftWidget[] } | undefined;
  const dashboard = state.dashboards.find((item) => item.id === input.dashboardId);
  const previous = baseDraft?.widgets ? baseDraft : existing?.draft ? existing.draft : dashboard;
  const preserveWidgets = !/\b(replace|clear|remove all|start over)\b/i.test(prompt);
  const widgets = preserveWidgets
    ? [...(previous?.widgets ?? []), ...proposal.widgets]
    : proposal.widgets;
  if (widgets.length > 20) throw new Error('The demo dashboard supports up to 20 widgets.');
  if (previous?.widgets?.length && preserveWidgets) {
    const bottom = previous.widgets.reduce(
      (max, widget) => Math.max(max, widget.layout.y + widget.layout.h),
      0,
    );
    widgets[widgets.length - 1] = {
      ...proposal.widgets[0],
      layout: { ...proposal.widgets[0].layout, y: bottom },
    };
  }
  const conversationId = existing?.id ?? `demo-conversation-${crypto.randomUUID()}`;
  const result: DemoDraft = {
    ...proposal,
    title: previous?.title || proposal.title,
    widgets,
    message: `Simulated proposal: ${proposal.widgets[0].widgetType === 'attributes-table' ? 'a table' : 'a widget'} for ${proposal.title.toLowerCase()}. Review it and apply it to the editor.`,
    conversationId,
    remainingRequests: state.limits.dailyRequests,
  };
  const conversation: DemoConversation = existing ?? {
    id: conversationId,
    title: proposal.title,
    updatedAt: new Date().toISOString(),
    dashboardId: typeof input.dashboardId === 'string' ? input.dashboardId : null,
    connectionId: DEMO_CONNECTION_ID,
    messages: [],
    draft: null,
  };
  conversation.messages.push(
    { id: `demo-message-${crypto.randomUUID()}`, role: 'USER', content: prompt },
    { id: `demo-message-${crypto.randomUUID()}`, role: 'ASSISTANT', content: result.message },
  );
  conversation.title = proposal.title;
  conversation.updatedAt = new Date().toISOString();
  conversation.draft = result;
  if (!existing) state.conversations.unshift(conversation);
  writeState(state);
  return result;
}

/** All demo traffic terminates here; an unknown route must never fall through to fetch. */
export async function demoRequest(method: Method, path: string, body?: unknown): Promise<unknown> {
  const url = new URL(path, 'http://demo.local');
  const parts = url.pathname.split('/').filter(Boolean);
  const query = url.searchParams;
  const state = readState();

  if (method === 'GET' && url.pathname === '/auth/me') {
    return { email: 'demo@iotarg.app', authority: 'SYS_ADMIN', appRole: 'ADMIN', customerId: null };
  }
  if (method === 'GET' && parts[0] === 'dashboards' && parts[1] === 'ai-settings') {
    if (parts[2] && parts[3] === 'models') return ['Local simulator'];
    return {
      connections: [
        { id: DEMO_CONNECTION_ID, provider: 'CUSTOM', model: 'Local simulator', endpointUrl: null },
      ],
      limits: state.limits,
      configured: true,
    };
  }
  if (method === 'PUT' && url.pathname === '/dashboards/ai-limits') {
    const input = body as DemoState['limits'];
    state.limits = { dailyRequests: input.dailyRequests, maxOutputTokens: input.maxOutputTokens };
    writeState(state);
    return state.limits;
  }
  if (parts[0] === 'dashboards' && parts[1] === 'ai-conversations') {
    if (method === 'GET' && !parts[2])
      return state.conversations.map(({ id, title, updatedAt, dashboardId, connectionId }) => ({
        id,
        title,
        updatedAt,
        dashboardId,
        connectionId,
      }));
    const conversation = state.conversations.find((item) => item.id === parts[2]);
    if (method === 'GET' && conversation) return conversation;
    if (method === 'PUT' && parts[3] === 'dashboard' && conversation) {
      conversation.dashboardId = String((body as { dashboardId: string }).dashboardId);
      writeState(state);
      return conversation;
    }
    if (method === 'DELETE' && conversation) {
      state.conversations = state.conversations.filter((item) => item.id !== parts[2]);
      writeState(state);
      return undefined;
    }
  }
  if (method === 'POST' && url.pathname === '/dashboards/generate') return generate(state, body);
  if (parts[0] === 'dashboards') {
    if (method === 'GET' && !parts[1])
      return state.dashboards.map((item) => ({
        ...item,
        widgets: undefined,
        _count: { widgets: item.widgets?.length ?? 0 },
      }));
    if (method === 'GET') {
      const found = state.dashboards.find((item) => item.id === parts[1]);
      if (found) return found;
    }
    if ((method === 'POST' && !parts[1]) || (method === 'PUT' && parts[1])) {
      const id = parts[1] ?? `demo-dashboard-${crypto.randomUUID()}`;
      const saved = asDashboard(id, body as SaveDashboardInput);
      state.dashboards = [saved, ...state.dashboards.filter((item) => item.id !== id)];
      writeState(state);
      return saved;
    }
    if (method === 'DELETE' && parts[1]) {
      state.dashboards = state.dashboards.filter((item) => item.id !== parts[1]);
      writeState(state);
      return undefined;
    }
  }

  if (method === 'GET' && ['devices', 'assets', 'customers'].includes(parts[0])) {
    const source = parts[0] === 'devices' ? DEVICES : parts[0] === 'assets' ? ASSETS : CUSTOMERS;
    if (!parts[1]) {
      const textSearch = (query.get('textSearch') ?? '').toLowerCase();
      return page(
        source.filter((item) =>
          `${item.name} ${item.label ?? ''}`.toLowerCase().includes(textSearch),
        ),
        query,
      );
    }
    if (parts[2] === 'hierarchy')
      return [
        { levelIndex: 0, name: 'Site' },
        { levelIndex: 1, name: 'Area' },
        { levelIndex: 2, name: 'Equipment' },
        { levelIndex: 3, name: 'Sensor' },
      ];
    if (parts[2] === 'children') {
      const assets =
        parts[0] === 'customers' ? ASSETS.filter((item) => item.customerId?.id === parts[1]) : [];
      const devices =
        parts[0] === 'assets' ? DEVICES.filter((item) => DEVICE_ASSET[item.id] === parts[1]) : [];
      return { assets, devices };
    }
    const found = source.find((item) => item.id === parts[1]);
    if (found) return found;
  }
  if (method === 'GET' && parts[0] === 'users') {
    const customerId = query.get('customerId');
    return USERS.filter((item) => !customerId || item.customerId?.id === customerId);
  }
  if (method === 'GET' && parts[0] === 'alarms') {
    return page(
      ALARMS.filter(
        (item) =>
          (!query.get('severity') || item.severity === query.get('severity')) &&
          (!query.get('status') || item.status === query.get('status')) &&
          (!query.get('entityType') || item.originator.entityType === query.get('entityType')),
      ),
      query,
    );
  }
  if (method === 'GET' && parts[0] === 'entities' && parts[1]) {
    const id = parts[1];
    if (!entity(id)) throw new Error(`Entity not found in demo mode: ${id}`);
    if (!parts[2]) {
      const found = entity(id);
      if (found) return found;
    }
    if (parts[2] === 'alarms')
      return page(
        ALARMS.filter((item) => item.originator.id === id),
        query,
      );
    if (parts[2] === 'attributes') {
      const scope = query.get('scope');
      const now = Date.now();
      return scope === 'SERVER_SCOPE'
        ? [{ key: 'serialNumber', value: `SIM-${id.slice(-2).toUpperCase()}`, lastUpdateTs: now }]
        : scope === 'SHARED_SCOPE'
          ? [{ key: 'status', value: 'operational', lastUpdateTs: now }]
          : [{ key: 'site', value: entity(id)?.customerId?.name ?? 'Demo', lastUpdateTs: now }];
    }
    if (parts[2] === 'telemetry') {
      if (parts[3] === 'keys') return Object.keys(telemetry(id));
      if (parts[3] === 'latest') {
        const latest = telemetry(id);
        const keys = query.get('keys')?.split(',');
        return keys
          ? Object.fromEntries(Object.entries(latest).filter(([key]) => keys.includes(key)))
          : latest;
      }
      if (parts[3] === 'timeseries') return timeseries(id, query);
    }
  }
  throw new Error(`Action unavailable in demo mode: ${method} ${url.pathname}`);
}
