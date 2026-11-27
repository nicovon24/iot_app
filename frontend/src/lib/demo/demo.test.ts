import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api';
import { startDemoSession, stopDemoSession } from './demo-session';
import type { Dashboard, PageData, EntityRef } from '@/types';

const values = new Map<string, string>();
const sessionStorage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => void values.set(key, value),
  removeItem: (key: string) => void values.delete(key),
  clear: () => values.clear(),
};

beforeEach(() => {
  values.clear();
  vi.stubGlobal('window', { sessionStorage });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Demo reached the network');
    }),
  );
});

describe('demo isolation', () => {
  it('serves a coherent fleet without sending API requests', async () => {
    startDemoSession();
    const devices = await apiClient.get<PageData<EntityRef>>('/devices');
    const first = devices.data[0];
    const keys = await apiClient.get<string[]>(`/entities/${first.id}/telemetry/keys?type=DEVICE`);
    const latest = await apiClient.get<Record<string, { value: string }>>(
      `/entities/${first.id}/telemetry/latest?type=DEVICE`,
    );
    expect(devices.totalElements).toBeGreaterThan(0);
    expect(keys).toContain('temperature');
    expect(typeof latest.temperature.value).toBe('string');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('generates and saves a table dashboard only in the demo session', async () => {
    startDemoSession();
    const settings = await apiClient.get<{ connections: { id: string }[] }>(
      '/dashboards/ai-settings',
    );
    const draft = await apiClient.post<{
      title: string;
      widgets: { widgetType: string; config: Record<string, unknown>; layout: object }[];
    }>('/dashboards/generate', {
      prompt: 'A table with all devices and temperature',
      connectionId: settings.connections[0].id,
    });
    expect(draft.widgets).toHaveLength(1);
    expect(draft.widgets[0].widgetType).toBe('attributes-table');
    expect(draft.widgets[0].config.entityScope).toBe('ALL');
    const saved = await apiClient.post<Dashboard>('/dashboards', {
      title: draft.title,
      visibility: 'PRIVATE',
      customerScope: 'ALL',
      customerIds: [],
      widgets: draft.widgets,
    });
    expect((await apiClient.get<Dashboard>(`/dashboards/${saved.id}`)).widgets).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves existing widgets when the assistant adds a widget', async () => {
    startDemoSession();
    const original = await apiClient.get<Dashboard>('/dashboards/demo-fleet-dashboard');
    const originalWidgets = original.widgets ?? [];
    const draft = await apiClient.post<{
      title: string;
      widgets: { widgetType: string; config: Record<string, unknown>; layout: object }[];
    }>('/dashboards/generate', {
      prompt: 'Add a table with device temperature',
      dashboardId: original.id,
      baseDraft: { title: original.title, widgets: originalWidgets },
    });
    expect(draft.title).toBe(original.title);
    expect(draft.widgets).toHaveLength(originalWidgets.length + 1);
    expect(draft.widgets.slice(0, -1).map((widget) => widget.widgetType)).toEqual(
      originalWidgets.map((widget) => widget.widgetType),
    );
    expect(draft.widgets.at(-1)?.widgetType).toBe('attributes-table');
    const saved = await apiClient.put<Dashboard>(`/dashboards/${original.id}`, {
      title: draft.title,
      visibility: original.visibility,
      customerScope: original.customerScope,
      customerIds: original.customerAccess.map((access) => access.customerId),
      widgets: draft.widgets,
    });
    expect(saved.widgets).toHaveLength(originalWidgets.length + 1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects telemetry requests for an unknown demo entity', async () => {
    startDemoSession();
    await expect(apiClient.get('/entities/unknown/telemetry/latest')).rejects.toThrow(/not found/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never falls through to the real backend for an unsupported demo action', async () => {
    startDemoSession();
    await expect(apiClient.post('/users/unknown/impersonate')).rejects.toThrow(/demo/i);
    expect(fetch).not.toHaveBeenCalled();
    stopDemoSession();
    expect(values.get('iot_demo_mode')).toBeUndefined();
  });
});
