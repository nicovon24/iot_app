'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { apiClient, isDemoSession, toastError, toastSuccess } from '@/lib';
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
  message?: string;
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
  { value: 'CUSTOM', label: 'Approved URL' },
];
const fieldClass = 'mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-heading';
const subscribeToDemoMode = () => () => {};

export function draftChanges(current: Draft['widgets'], proposed: Draft['widgets']) {
  const matched = new Set<number>();
  let added = 0;
  let changed = 0;
  let moved = 0;
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
    if (JSON.stringify(current[index].config) !== JSON.stringify(next.config)) changed++;
    if (JSON.stringify(current[index].layout) !== JSON.stringify(next.layout)) moved++;
  }
  return { added, changed, moved, removed: current.length - matched.size };
}

function describeDraftWidget(widget: Draft['widgets'][number]): string {
  if (widget.widgetType !== 'attributes-table' || widget.config.entityScope !== 'ALL') {
    return `${widget.widgetType} · ${String(widget.config.title ?? widget.config.telemetryKey ?? 'widget')}`;
  }
  const columns = Array.isArray(widget.config.dataKeys)
    ? widget.config.dataKeys
        .map((entry) => {
          if (!entry || typeof entry !== 'object' || !('key' in entry)) return '';
          return entry.key === '*' ? 'keys detected on each page' : String(entry.key);
        })
        .filter(Boolean)
        .join(', ')
    : 'no columns';
  const entityLabel = widget.config.entityType === 'ASSET' ? 'assets' : 'devices';
  return `Latest readings table · rows: all ${entityLabel} · columns: ${columns}`;
}

export function AiDashboardPanel({
  isOpen,
  onClose,
  onDraft,
  dashboardId,
  currentTitle,
  currentWidgets,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDraft: (draft: Draft) => void;
  dashboardId?: string;
  currentTitle: string;
  currentWidgets: Draft['widgets'];
}) {
  const demo = useSyncExternalStore(subscribeToDemoMode, isDemoSession, () => false);
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
  const [view, setView] = useState<'chat' | 'settings' | 'help'>('chat');
  const [error, setError] = useState('');
  const [editorDraftApplied, setEditorDraftApplied] = useState(false);
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
      .catch((error) => toastError('Could not load the assistant', error));
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
      toastSuccess('API key replaced');
    } catch (error) {
      toastError('Could not replace the API key', error);
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
      toastSuccess('Connection saved');
    } catch (error) {
      toastError('Could not save the connection', error);
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
      setHistory((current) =>
        current.map((item) =>
          item.connectionId === selectedConnection ? { ...item, connectionId: null } : item,
        ),
      );
      setSelectedConnection(remaining[0]?.id ?? '');
      setSelectedModel(remaining[0]?.model ?? '');
      toastSuccess('Connection deleted');
    } catch (error) {
      toastError('Could not delete the connection', error);
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
      toastSuccess('Limits saved');
    } catch (error) {
      toastError('Could not save the limits', error);
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
      toastError('Could not load models; you can enter the model ID', error);
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
      toastSuccess('Model updated');
    } catch (error) {
      toastError('Could not update the model', error);
    } finally {
      setBusy(false);
    }
  }

  async function openConversation(id: string) {
    if (!id) {
      setConversationId('');
      setMessages([]);
      setDraft(null);
      setEditorDraftApplied(false);
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
      setEditorDraftApplied(false);
    } catch (error) {
      toastError('Could not open the conversation', error);
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
      toastSuccess('Conversation deleted');
    } catch (error) {
      toastError('Could not delete the conversation', error);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const result = await apiClient.post<Draft>('/dashboards/generate', {
        prompt: prompt.trim(),
        ...(conversationId
          ? {
              conversationId,
              connectionId: selectedConnection,
              ...(editorDraftApplied
                ? { baseDraft: { title: currentTitle, widgets: currentWidgets } }
                : {}),
            }
          : {
              connectionId: selectedConnection,
              ...(dashboardId ? { dashboardId } : {}),
              baseDraft: { title: currentTitle, widgets: currentWidgets },
            }),
      });
      setConversationId(result.conversationId);
      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: 'USER', content: prompt.trim() },
        {
          id: `assistant-${Date.now()}`,
          role: 'ASSISTANT',
          content:
            result.message ?? `Draft ready: ${result.title} (${result.widgets.length} widgets).`,
        },
      ]);
      setDraft(result);
      setEditorDraftApplied(false);
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
      setError(error instanceof Error ? error.message : 'Could not generate the draft');
      toastError('Could not generate the draft', error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={close} widthClassName="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Dashboard assistant</DialogTitle>
        <DialogCloseButton />
      </DialogHeader>
      <DialogBody className="max-h-[75vh] space-y-5 overflow-y-auto">
        <div
          className="flex gap-2 border-b border-border pb-2"
          role="tablist"
          aria-label="Assistant view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'chat'}
            onClick={() => setView('chat')}
            className={`rounded-md px-3 py-2 text-sm ${view === 'chat' ? 'bg-tint font-semibold text-heading' : 'text-muted'}`}
          >
            Conversation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'settings'}
            onClick={() => setView('settings')}
            className={`rounded-md px-3 py-2 text-sm ${view === 'settings' ? 'bg-tint font-semibold text-heading' : 'text-muted'}`}
          >
            Settings
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'help'}
            onClick={() => setView('help')}
            className={`rounded-md px-3 py-2 text-sm ${view === 'help' ? 'bg-tint font-semibold text-heading' : 'text-muted'}`}
          >
            How it works
          </button>
        </div>
        <p className="text-sm text-muted">
          {demo
            ? 'Demo: the assistant uses local rules and simulated data. It does not call an AI model or require an API key. Review the draft before applying it.'
            : 'The AI receives the widget, device, and telemetry key catalogs. Review the draft before applying it to the editor.'}
        </p>
        {view === 'help' && (
          <section className="space-y-4 rounded-md border border-border p-4 text-sm text-muted">
            <div>
              <h3 className="font-semibold text-heading">Create or edit a dashboard</h3>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>
                  {demo
                    ? 'The demo uses a local simulator without an API key.'
                    : 'Set up a connection with your provider, model, and API key.'}
                </li>
                <li>Describe the widgets, devices, and telemetry keys you want to see.</li>
                <li>Review the proposal and request changes in the conversation.</li>
                <li>Apply the draft to the editor and save the dashboard when it is ready.</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-heading">Models and usage</h3>
              <p className="mt-1">
                You can enter a model ID for a compatible provider or browse available models.
                Administrators can also approve custom endpoint URLs. The API key is encrypted on
                the server, and you can set daily request and output token limits.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-heading">Scope and limitations</h3>
              <p className="mt-1">
                The assistant uses this instance&apos;s widget, device, and telemetry key catalogs.
                It does not receive current readings or measurement history. It may propose the
                wrong widget or an incomplete configuration while this feature is in development.
                Preview the changes before applying the draft and saving the dashboard.
              </p>
            </div>
          </section>
        )}
        {view === 'settings' && demo && (
          <p className="rounded-md border border-accent-strong/40 bg-tint p-4 text-sm text-heading">
            Demo mode uses a local simulator. To connect a model and save your API key, exit the
            demo and sign in.
          </p>
        )}
        {view === 'settings' && !demo && (
          <section className="space-y-3 rounded-md border border-border p-3">
            <h3 className="text-sm font-semibold text-heading">AI connections</h3>
            <div className="flex flex-wrap gap-2">
              <select
                className={fieldClass}
                value={selectedConnection}
                disabled={Boolean(
                  conversationId &&
                  history.find((item) => item.id === conversationId)?.connectionId,
                )}
                onChange={(event) => {
                  setSelectedConnection(event.target.value);
                  setSelectedModel(
                    settings?.connections.find((item) => item.id === event.target.value)?.model ??
                      '',
                  );
                  setModelOptions([]);
                }}
                aria-label="AI connection"
              >
                <option value="">Choose a connection</option>
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
                Delete selected
              </button>
            </div>
            {selectedConnection && (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <label className="text-sm text-muted">
                  Selected connection model
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
                  Browse models
                </button>
                <button
                  type="button"
                  disabled={busy || !selectedModel.trim()}
                  onClick={updateSelectedModel}
                  className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Save model
                </button>
              </div>
            )}
            {selectedConnection && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-56 flex-1 text-sm text-muted">
                  Replace API key
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
                  Save key
                </button>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-muted">
                Provider
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
                Model
                <input
                  className={fieldClass}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  maxLength={100}
                  placeholder="Model ID"
                />
              </label>
              {provider === 'CUSTOM' && (
                <label className="text-sm text-muted sm:col-span-2">
                  Approved URL
                  <input
                    className={fieldClass}
                    value={endpointUrl}
                    onChange={(event) => setEndpointUrl(event.target.value)}
                    placeholder="https://provider.example/v1/chat/completions"
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
                  placeholder="The key is encrypted on the server"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy || apiKey.trim().length < 8 || !model.trim()}
              onClick={saveConnection}
              className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
            >
              Add connection
            </button>
          </section>
        )}
        {view === 'settings' && !demo && (
          <section className="space-y-3 rounded-md border border-border p-3">
            <h3 className="text-sm font-semibold text-heading">Usage limits</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-muted">
                Requests per day
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
                Maximum output tokens per response
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
              Save limits
            </button>
            {remainingRequests !== null && (
              <p className="text-xs text-muted">{remainingRequests} requests remaining today.</p>
            )}
          </section>
        )}
        {view === 'chat' && (
          <section className="space-y-3 rounded-md border border-border p-3">
            <h3 className="text-sm font-semibold text-heading">Conversation</h3>
            <p className="text-xs text-muted">
              {demo
                ? 'DEMO'
                : (settings?.connections.find((item) => item.id === selectedConnection)?.provider ??
                  'No provider')}{' '}
              ·{' '}
              {settings?.connections.find((item) => item.id === selectedConnection)?.model ??
                'Set up a connection to get started'}
            </p>
            {!selectedConnection && (
              <button
                type="button"
                onClick={() => setView('settings')}
                className="text-sm text-heading underline"
              >
                Set up AI
              </button>
            )}
            <select
              className={fieldClass}
              value={conversationId}
              onChange={(event) => void openConversation(event.target.value)}
              aria-label="Conversation history"
            >
              <option value="">New conversation</option>
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
                Delete conversation
              </button>
            )}
            <div className="max-h-40 space-y-2 overflow-y-auto text-sm text-muted">
              {messages.map((item) => (
                <p key={item.id}>
                  <strong>{item.role === 'USER' ? 'You' : 'AI'}:</strong> {item.content}
                </p>
              ))}
            </div>
            <textarea
              className={`${fieldClass} min-h-24`}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={1000}
              placeholder="Describe which widgets to add, change, move, or remove"
            />
            {error && (
              <p
                role="alert"
                className="rounded-md border border-border px-3 py-2 text-sm text-heading"
              >
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={busy || !selectedConnection || prompt.trim().length < 3}
              onClick={generate}
              className="btn-accent rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Generating…' : 'Send to assistant'}
            </button>
          </section>
        )}
        {view === 'chat' && draft && (
          <section className="space-y-2 rounded-md border border-accent p-3">
            <h3 className="text-sm font-semibold text-heading">Preview: {draft.title}</h3>
            <p className="text-sm text-muted">
              {changes?.added} added · {changes?.changed} changed · {changes?.moved} moved ·{' '}
              {changes?.removed} removed
            </p>
            <ul className="list-inside list-disc text-sm text-muted">
              {draft.widgets.map((item, index) => (
                <li key={index}>{describeDraftWidget(item)}</li>
              ))}
            </ul>
            {draft.widgets.some(
              (item) => item.widgetType === 'attributes-table' && item.config.entityScope === 'ALL',
            ) && (
              <p className="text-xs text-muted">
                The table shows 20 devices per page and lets you browse the rest.
              </p>
            )}
            <p className="text-xs text-muted">
              This proposal is not saved yet. You can keep chatting or apply it to the editor.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onDraft(draft);
                setEditorDraftApplied(true);
                close();
              }}
              className="btn-accent rounded-md px-4 py-2 text-sm font-semibold"
            >
              Apply to editor
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
          Close
        </button>
      </DialogFooter>
    </Dialog>
  );
}
