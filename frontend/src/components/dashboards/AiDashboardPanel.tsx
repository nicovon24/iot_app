'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib';
import { toastError, toastSuccess } from '@/lib';
import type { DashboardWidgetLayout } from '@/types';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';

type Provider = 'OPENAI' | 'ANTHROPIC' | 'GEMINI';
type AiSettings = { provider: Provider | null; model: string | null; configured: boolean };
type Draft = {
  title: string;
  widgets: { widgetType: string; config: Record<string, unknown>; layout: DashboardWidgetLayout }[];
};

const suggestedModels: Record<Provider, string[]> = {
  OPENAI: ['gpt-4.1-mini', 'gpt-4.1'],
  ANTHROPIC: ['claude-sonnet-4-5', 'claude-haiku-4-5'],
  GEMINI: ['gemini-2.5-flash', 'gemini-2.5-pro'],
};

export function AiDashboardPanel({
  isOpen,
  onClose,
  onDraft,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDraft: (draft: Draft) => void;
}) {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [provider, setProvider] = useState<Provider>('OPENAI');
  const [model, setModel] = useState(suggestedModels.OPENAI[0]);
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiClient.get<AiSettings>('/dashboards/ai-settings').then((value) => {
      setSettings(value);
      if (value.provider) setProvider(value.provider);
      if (value.model) setModel(value.model);
    }).catch((error) => toastError('No se pudo cargar la configuración de IA', error));
  }, [isOpen]);

  function close() {
    setApiKey('');
    onClose();
  }

  async function saveSettings() {
    setBusy(true);
    try {
      const saved = await apiClient.put<AiSettings>('/dashboards/ai-settings', {
        provider,
        model: model.trim(),
        apiKey: apiKey.trim(),
      });
      setSettings(saved);
      setApiKey('');
      toastSuccess('Proveedor de IA guardado');
    } catch (error) {
      toastError('No se pudo guardar el proveedor', error);
    } finally {
      setBusy(false);
    }
  }

  async function removeSettings() {
    setBusy(true);
    try {
      await apiClient.delete('/dashboards/ai-settings');
      setSettings({ provider: null, model: null, configured: false });
      setApiKey('');
      toastSuccess('Conexión de IA eliminada');
    } catch (error) {
      toastError('No se pudo eliminar la conexión', error);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    try {
      const draft = await apiClient.post<Draft>('/dashboards/generate', { prompt: prompt.trim() });
      onDraft(draft);
      toastSuccess(`${draft.widgets.length} widgets agregados al borrador`);
      close();
    } catch (error) {
      toastError('No se pudo generar el dashboard', error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={close} widthClassName="max-w-xl">
      <DialogHeader>
        <DialogTitle>Crear dashboard con IA</DialogTitle>
        <DialogCloseButton />
      </DialogHeader>
      <DialogBody className="space-y-4">
        <p className="text-sm text-muted">
          Elegí tu proveedor y modelo. La clave se guarda cifrada en el servidor; solo se envían
          nombres de sensores, claves de telemetría y tu descripción al proveedor elegido.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-muted">
            Proveedor
            <select
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-heading"
              value={provider}
              onChange={(event) => {
                const next = event.target.value as Provider;
                setProvider(next);
                setModel(suggestedModels[next][0]);
              }}
            >
              <option value="OPENAI">OpenAI</option>
              <option value="ANTHROPIC">Anthropic</option>
              <option value="GEMINI">Google Gemini</option>
            </select>
          </label>
          <label className="text-sm text-muted">
            Modelo
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-heading"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              list="ai-model-options"
              maxLength={100}
            />
            <datalist id="ai-model-options">
              {suggestedModels[provider].map((value) => <option key={value} value={value} />)}
            </datalist>
          </label>
        </div>
        <label className="block text-sm text-muted">
          Clave API {settings?.configured && '(guardada; ingresá una nueva para cambiarla)'}
          <input
            type="password"
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-heading"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Clave del proveedor"
          />
        </label>
        <div className="flex gap-2">
          <button type="button" disabled={busy || !apiKey.trim() || !model.trim()} onClick={saveSettings} className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50">
            Guardar conexión
          </button>
          {settings?.configured && (
            <button type="button" disabled={busy} onClick={removeSettings} className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50">
              Eliminar conexión
            </button>
          )}
        </div>
        <label className="block text-sm text-muted">
          Describí el dashboard
          <textarea
            className="mt-1 min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2 text-heading"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={1000}
            placeholder="Por ejemplo: evolución de temperatura y presión de mis bombas, con indicadores actuales"
          />
        </label>
        <p className="text-xs text-muted">El resultado se agrega al editor. Revisalo antes de guardar.</p>
      </DialogBody>
      <DialogFooter>
        <button type="button" disabled={busy || !settings?.configured || prompt.trim().length < 3} onClick={generate} className="btn-accent rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {busy ? 'Procesando…' : 'Generar borrador'}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
