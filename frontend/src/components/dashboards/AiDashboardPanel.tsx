'use client';

import { useEffect, useState } from 'react';
import { apiClient, toastError, toastSuccess } from '@/lib';
import type { DashboardWidgetLayout } from '@/types';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';

type Provider = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'GROQ' | 'OPENROUTER' | 'CUSTOM';
type Connection = { id: string; provider: Provider; model: string; endpointUrl: string | null };
type Limits = { dailyRequests: number; maxOutputTokens: number };
type Settings = { connections: Connection[]; limits: Limits };
type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  dashboardId: string | null;
  connectionId: string | null;
};
type Message = { id: string; role: string; content: string };
type Draft = {
  title: string;
  widgets: { widgetType: string; config: Record<string, unknown>; layout: DashboardWidgetLayout }[];
  conversationId: string;
  remainingRequests: number;
};

const providers: { value: Provider; label: string }[] = [
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'ANTHROPIC', label: 'Anthropic' },
  { value: 'GEMINI', label: 'Gemini' },
  { value: 'GROQ', label: 'Groq' },
  { value: 'OPENROUTER', label: 'OpenRouter' },
  { value: 'CUSTOM', label: 'URL autorizada' },
];
const fieldClass = 'mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-heading';

function draftChanges(current: Draft['widgets'], proposed: Draft['widgets']) {
  const matched = new Set<number>();
  let added = 0;
  let changed = 0;
  for (const next of proposed) {
    const index = current.findIndex(
      (item, i) =>
        !matched.has(i) &&
        item.widgetType === next.widgetType &&
        item.config.entityId === next.config.entityId &&
        item.config.telemetryKey === next.config.telemetryKey,
    );
    if (index < 0) {
      added++;
      continue;
    }
    matched.add(index);
    if (
      JSON.stringify(current[index].config) !== JSON.stringify(next.config) ||
      JSON.stringify(current[index].layout) !== JSON.stringify(next.layout)
    )
      changed++;
  }
  return { added, changed, removed: current.length - matched.size };
}

export function AiDashboardPanel({
  isOpen,
  onClose,
  onDraft,
  dashboardId,
  currentWidgets,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDraft: (draft: Draft) => void;
  dashboardId?: string;
  currentWidgets: Draft['widgets'];
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [provider, setProvider] = useState<Provider>('OPENAI');
  const [model, setModel] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [replacementKey, setReplacementKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dailyRequests, setDailyRequests] = useState(20);
  const [maxOutputTokens, setMaxOutputTokens] = useState(2000);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const changes = draft ? draftChanges(currentWidgets, draft.widgets) : null;

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      apiClient.get<Settings>('/dashboards/ai-settings'),
      apiClient.get<ConversationSummary[]>('/dashboards/ai-conversations'),
    ])
      .then(([nextSettings, nextHistory]) => {
        setSettings(nextSettings);
        setHistory(nextHistory.filter((item) => item.dashboardId === (dashboardId ?? null)));
        setSelectedConnection((current) => current || nextSettings.connections[0]?.id || '');
        setSelectedModel(nextSettings.connections[0]?.model ?? '');
        setDailyRequests(nextSettings.limits.dailyRequests);
        setMaxOutputTokens(nextSettings.limits.maxOutputTokens);
      })
      .catch((error) => toastError('No se pudo cargar el asistente', error));
  }, [isOpen, dashboardId]);

  function close() {
    setApiKey('');
    setReplacementKey('');
    onClose();
  }

  async function replaceKey() {
    const current = settings?.connections.find((item) => item.id === selectedConnection);
    if (!current || replacementKey.trim().length < 8) return;
    setBusy(true);
    try {
      await apiClient.put(`/dashboards/ai-settings/${current.id}`, {
        provider: current.provider,
        model: current.model,
        apiKey: replacementKey.trim(),
        ...(current.endpointUrl ? { endpointUrl: current.endpointUrl } : {}),
      });
      setReplacementKey('');
      toastSuccess('Clave reemplazada');
    } catch (error) {
      toastError('No se pudo reemplazar la clave', error);
    } finally {
      setBusy(false);
    }
  }

  async function saveConnection() {
    setBusy(true);
    try {
      const connection = await apiClient.post<Connection>('/dashboards/ai-settings', {
        provider,
        model: model.trim(),
        apiKey: apiKey.trim(),
        ...(provider === 'CUSTOM' ? { endpointUrl: endpointUrl.trim() } : {}),
      });
      setSettings((current) =>
        current ? { ...current, connections: [connection, ...current.connections] } : current,
      );
      setSelectedConnection(connection.id);
      setSelectedModel(connection.model);
      setApiKey('');
      toastSuccess('Conexión guardada');
    } catch (error) {
      toastError('No se pudo guardar la conexión', error);
    } finally {
      setBusy(false);
    }
  }

  async function removeConnection() {
    if (!selectedConnection) return;
    setBusy(true);
    try {
      await apiClient.delete(`/dashboards/ai-settings/${selectedConnection}`);
      const remaining =
        settings?.connections.filter((item) => item.id !== selectedConnection) ?? [];
      setSettings((current) => (current ? { ...current, connections: remaining } : current));
      setSelectedConnection(remaining[0]?.id ?? '');
      setSelectedModel(remaining[0]?.model ?? '');
      toastSuccess('Conexión eliminada');
    } catch (error) {
      toastError('No se pudo eliminar la conexión', error);
    } finally {
      setBusy(false);
    }
  }

  async function saveLimits() {
    setBusy(true);
    try {
      const limits = await apiClient.put<Limits>('/dashboards/ai-limits', {
        dailyRequests,
        maxOutputTokens,
      });
      setSettings((current) => (current ? { ...current, limits } : current));
      toastSuccess('Límites guardados');
    } catch (error) {
      toastError('No se pudieron guardar los límites', error);
    } finally {
      setBusy(false);
    }
  }

  async function loadModels() {
    if (!selectedConnection) return;
    setBusy(true);
    try {
      setModelOptions(
        await apiClient.get<string[]>(`/dashboards/ai-settings/${selectedConnection}/models`),
      );
    } catch (error) {
      toastError('No se pudo consultar modelos; podés escribir el ID', error);
    } finally {
      setBusy(false);
    }
  }

  async function updateSelectedModel() {
    const current = settings?.connections.find((item) => item.id === selectedConnection);
    if (!current || !selectedModel.trim()) return;
    setBusy(true);
    try {
      const updated = await apiClient.put<Connection>(`/dashboards/ai-settings/${current.id}`, {
        provider: current.provider,
        model: selectedModel.trim(),
        ...(current.endpointUrl ? { endpointUrl: current.endpointUrl } : {}),
      });
      setSettings((value) =>
        value
          ? {
              ...value,
              connections: value.connections.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : value,
      );
      toastSuccess('Modelo actualizado');
    } catch (error) {
      toastError('No se pudo actualizar el modelo', error);
    } finally {
      setBusy(false);
    }
  }

  async function openConversation(id: string) {
    if (!id) {
      setConversationId('');
      setMessages([]);
      setDraft(null);
      return;
    }
    setBusy(true);
    try {
      const conversation = await apiClient.get<{
        connectionId: string | null;
        messages: Message[];
        draft: Draft | null;
      }>(`/dashboards/ai-conversations/${id}`);
      setConversationId(id);
      setSelectedConnection(conversation.connectionId ?? '');
      setSelectedModel(
        settings?.connections.find((item) => item.id === conversation.connectionId)?.model ?? '',
      );
      setMessages(conversation.messages);
      setDraft(
        conversation.draft
          ? { ...conversation.draft, conversationId: id, remainingRequests: 0 }
          : null,
      );
    } catch (error) {
      toastError('No se pudo abrir la conversación', error);
    } finally {
      setBusy(false);
    }
  }

  async function deleteConversation() {
    if (!conversationId) return;
    setBusy(true);
    try {
      await apiClient.delete(`/dashboards/ai-conversations/${conversationId}`);
      setHistory((current) => current.filter((item) => item.id !== conversationId));
      setConversationId('');
      setMessages([]);
      setDraft(null);
      toastSuccess('Conversación eliminada');
    } catch (error) {
      toastError('No se pudo eliminar la conversación', error);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    try {
      const result = await apiClient.post<Draft>('/dashboards/generate', {
        prompt: prompt.trim(),
        ...(conversationId
          ? { conversationId, connectionId: selectedConnection }
          : { connectionId: selectedConnection, ...(dashboardId ? { dashboardId } : {}) }),
      });
      setConversationId(result.conversationId);
      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: 'USER', content: prompt.trim() },
        {
          id: `assistant-${Date.now()}`,
          role: 'ASSISTANT',
          content: `Borrador listo: ${result.title} (${result.widgets.length} widgets).`,
        },
      ]);
      setDraft(result);
      setRemainingRequests(result.remainingRequests);
      setPrompt('');
      setHistory((current) => [
        {
          id: result.conversationId,
          title: result.title,
          updatedAt: new Date().toISOString(),
          dashboardId: dashboardId ?? null,
          connectionId: selectedConnection,
        },
        ...current.filter((item) => item.id !== result.conversationId),
      ]);
    } catch (error) {
      toastError('No se pudo generar el borrador', error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={close} widthClassName="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Asistente de dashboards</DialogTitle>
        <DialogCloseButton />
      </DialogHeader>
      <DialogBody className="max-h-[75vh] space-y-5 overflow-y-auto">
        <p className="text-sm text-muted">
          La IA recibe el catálogo de widgets, dispositivos y claves de telemetría. Revisá el
          borrador antes de aplicarlo al editor.
        </p>
        <section className="space-y-3 rounded-md border border-border p-3">
          <h3 className="text-sm font-semibold text-heading">Conexiones de IA</h3>
          <div className="flex flex-wrap gap-2">
            <select
              className={fieldClass}
              value={selectedConnection}
              disabled={Boolean(conversationId)}
              onChange={(event) => {
                setSelectedConnection(event.target.value);
                setSelectedModel(
                  settings?.connections.find((item) => item.id === event.target.value)?.model ?? '',
                );
                setModelOptions([]);
              }}
              aria-label="Conexión de IA"
            >
              <option value="">Elegí una conexión</option>
              {settings?.connections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.provider} · {item.model}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !selectedConnection}
              onClick={removeConnection}
              className="text-sm text-muted disabled:opacity-50"
            >
              Eliminar elegida
            </button>
          </div>
          {selectedConnection && (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="text-sm text-muted">
                Modelo de la conexión elegida
                <input
                  className={fieldClass}
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  list="available-ai-models"
                />
                <datalist id="available-ai-models">
                  {modelOptions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={loadModels}
                className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
              >
                Consultar modelos
              </button>
              <button
                type="button"
                disabled={busy || !selectedModel.trim()}
                onClick={updateSelectedModel}
                className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
              >
                Guardar modelo
              </button>
            </div>
          )}
          {selectedConnection && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-56 flex-1 text-sm text-muted">
                Reemplazar API key
                <input
                  type="password"
                  autoComplete="off"
                  className={fieldClass}
                  value={replacementKey}
                  onChange={(event) => setReplacementKey(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busy || replacementKey.trim().length < 8}
                onClick={replaceKey}
                className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
              >
                Guardar clave
              </button>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted">
              Proveedor
              <select
                className={fieldClass}
                value={provider}
                onChange={(event) => setProvider(event.target.value as Provider)}
              >
                {providers.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted">
              Modelo
              <input
                className={fieldClass}
                value={model}
                onChange={(event) => setModel(event.target.value)}
                maxLength={100}
                placeholder="ID del modelo"
              />
            </label>
            {provider === 'CUSTOM' && (
              <label className="text-sm text-muted sm:col-span-2">
                URL aprobada
                <input
                  className={fieldClass}
                  value={endpointUrl}
                  onChange={(event) => setEndpointUrl(event.target.value)}
                  placeholder="https://proveedor.example/v1/chat/completions"
                />
              </label>
            )}
            <label className="text-sm text-muted sm:col-span-2">
              API key
              <input
                type="password"
                autoComplete="off"
                className={fieldClass}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="La clave queda cifrada en el servidor"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || apiKey.trim().length < 8 || !model.trim()}
            onClick={saveConnection}
            className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
          >
            Agregar conexión
          </button>
        </section>
        <section className="space-y-3 rounded-md border border-border p-3">
          <h3 className="text-sm font-semibold text-heading">Límites de uso</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted">
              Solicitudes por día
              <input
                type="number"
                min={1}
                max={200}
                className={fieldClass}
                value={dailyRequests}
                onChange={(event) => setDailyRequests(Number(event.target.value))}
              />
            </label>
            <label className="text-sm text-muted">
              Tokens máximos por respuesta
              <input
                type="number"
                min={256}
                max={4096}
                className={fieldClass}
                value={maxOutputTokens}
                onChange={(event) => setMaxOutputTokens(Number(event.target.value))}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={saveLimits}
            className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
          >
            Guardar límites
          </button>
          {remainingRequests !== null && (
            <p className="text-xs text-muted">Quedan {remainingRequests} solicitudes hoy.</p>
          )}
        </section>
        <section className="space-y-3 rounded-md border border-border p-3">
          <h3 className="text-sm font-semibold text-heading">Conversación</h3>
          <select
            className={fieldClass}
            value={conversationId}
            onChange={(event) => void openConversation(event.target.value)}
            aria-label="Historial de conversaciones"
          >
            <option value="">Nueva conversación</option>
            {history.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          {conversationId && (
            <button
              type="button"
              disabled={busy}
              onClick={deleteConversation}
              className="text-sm text-muted disabled:opacity-50"
            >
              Eliminar conversación
            </button>
          )}
          <div className="max-h-40 space-y-2 overflow-y-auto text-sm text-muted">
            {messages.map((item) => (
              <p key={item.id}>
                <strong>{item.role === 'USER' ? 'Vos' : 'IA'}:</strong> {item.content}
              </p>
            ))}
          </div>
          <textarea
            className={`${fieldClass} min-h-24`}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={1000}
            placeholder="Describí qué widgets querés agregar, cambiar, mover o quitar"
          />
          <button
            type="button"
            disabled={busy || !selectedConnection || prompt.trim().length < 3}
            onClick={generate}
            className="btn-accent rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? 'Generando…' : 'Enviar al asistente'}
          </button>
        </section>
        {draft && (
          <section className="space-y-2 rounded-md border border-accent p-3">
            <h3 className="text-sm font-semibold text-heading">Vista previa: {draft.title}</h3>
            <p className="text-sm text-muted">
              {changes?.added} agregados · {changes?.changed} cambiados o movidos ·{' '}
              {changes?.removed} quitados
            </p>
            <ul className="list-inside list-disc text-sm text-muted">
              {draft.widgets.map((item, index) => (
                <li key={index}>
                  {item.widgetType} ·{' '}
                  {String(item.config.title ?? item.config.telemetryKey ?? 'widget')}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              La propuesta todavía no está guardada. Podés seguir conversando o aplicarla al editor.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onDraft(draft);
                close();
              }}
              className="btn-accent rounded-md px-4 py-2 text-sm font-semibold"
            >
              Aplicar al editor
            </button>
          </section>
        )}
      </DialogBody>
      <DialogFooter>
        <button
          type="button"
          onClick={close}
          className="rounded-md border border-border px-4 py-2 text-sm"
        >
          Cerrar
        </button>
      </DialogFooter>
    </Dialog>
  );
}
