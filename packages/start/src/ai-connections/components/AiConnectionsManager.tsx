import React, { useState } from 'react';
import { useToast } from '@cruzjs/ui';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { AiProviderValues, type AiProvider } from '../../database/schema';
import { AI_PROVIDER_CONFIGS, CUSTOM_MODEL_ID } from '../ai-connections.models';

const PROVIDER_DISPLAY: Record<AiProvider, { label: string; badgeClass: string }> = {
  ANTHROPIC: { label: 'Anthropic', badgeClass: 'bg-purple-100 text-purple-700' },
  OPENAI: { label: 'OpenAI', badgeClass: 'bg-emerald-100 text-emerald-700' },
  GEMINI: { label: 'Google Gemini', badgeClass: 'bg-primary-subtle text-primary' },
  FIREWORKS: { label: 'Fireworks AI', badgeClass: 'bg-amber-100 text-amber-700' },
};

export const AiConnectionsManager: React.FC = () => {
  const trpc = getTRPC();
  const toast = useToast();
  const utils = trpc.useUtils();
  const { data: connections, isLoading } = trpc.aiConnections.list.useQuery();

  const connectMutation = trpc.aiConnections.connect.useMutation({
    onSuccess: () => {
      utils.aiConnections.list.invalidate();
      toast({ title: 'AI provider connected', status: 'success', duration: 3000 });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 5000 });
    },
  });

  const disconnectMutation = trpc.aiConnections.disconnect.useMutation({
    onSuccess: () => {
      utils.aiConnections.list.invalidate();
      toast({ title: 'AI provider disconnected', status: 'success', duration: 3000 });
    },
  });

  const updateMutation = trpc.aiConnections.update.useMutation({
    onSuccess: () => {
      utils.aiConnections.list.invalidate();
      toast({ title: 'Connection updated', status: 'success', duration: 3000 });
    },
  });

  const testMutation = trpc.aiConnections.testConnection.useMutation();

  const connectedProviders = new Set(connections?.map((c: any) => c.provider) ?? []);

  return (
    <div className="flex flex-col gap-4">
      {AiProviderValues.map((provider) => {
        const conn = connections?.find((c: any) => c.provider === provider);
        const display = PROVIDER_DISPLAY[provider];

        return (
          <ProviderCard
            key={provider}
            provider={provider}
            display={display}
            connection={conn}
            isConnected={connectedProviders.has(provider)}
            onConnect={(apiKey, model) => {
              connectMutation.mutate({
                provider,
                apiKey,
                selectedModel: model,
              });
            }}
            onDisconnect={() => disconnectMutation.mutate({ provider })}
            onUpdate={(data) => updateMutation.mutate({ provider, ...data })}
            onTest={() => testMutation.mutateAsync({ provider })}
            isConnecting={connectMutation.isPending}
          />
        );
      })}
    </div>
  );
};

interface ProviderCardProps {
  provider: AiProvider;
  display: { label: string; badgeClass: string };
  connection?: {
    id: string;
    provider: string;
    displayName: string | null;
    selectedModel: string | null;
    isEnabled: boolean | null;
    isDefault: boolean | null;
  };
  isConnected: boolean;
  onConnect: (apiKey: string, model?: string) => void;
  onDisconnect: () => void;
  onUpdate: (data: { selectedModel?: string; isEnabled?: boolean; isDefault?: boolean }) => void;
  onTest: () => Promise<{ success: boolean; error?: string }>;
  isConnecting: boolean;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  display,
  connection,
  isConnected,
  onConnect,
  onDisconnect,
  onUpdate,
  onTest,
  isConnecting,
}) => {
  const toast = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const config = AI_PROVIDER_CONFIGS[provider];

  // Determine if the currently selected model is a known model or custom
  const currentModel = connection?.selectedModel || config.defaultModel;
  const isKnownModel = config.models.some((m) => m.id !== CUSTOM_MODEL_ID && m.id === currentModel);

  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [isCustom, setIsCustom] = useState(!isKnownModel && !!connection?.selectedModel);
  const [customModelId, setCustomModelId] = useState(!isKnownModel ? currentModel : '');

  const handleSelectChange = (value: string) => {
    if (value === CUSTOM_MODEL_ID) {
      setIsCustom(true);
      setCustomModelId('');
    } else {
      setIsCustom(false);
      setSelectedModel(value);
      setCustomModelId('');
      if (isConnected) {
        onUpdate({ selectedModel: value });
      }
    }
  };

  const handleCustomModelSave = () => {
    if (!customModelId.trim()) return;
    setSelectedModel(customModelId.trim());
    if (isConnected) {
      onUpdate({ selectedModel: customModelId.trim() });
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await onTest();
      if (result.success) {
        toast({ title: 'Connection successful', status: 'success', duration: 3000 });
      } else {
        toast({ title: 'Connection failed', description: result.error, status: 'error', duration: 5000 });
      }
    } catch {
      toast({ title: 'Test failed', status: 'error', duration: 3000 });
    } finally {
      setIsTesting(false);
    }
  };

  const effectiveModel = isCustom ? customModelId.trim() : selectedModel;

  return (
    <div className="border border-surface-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-strong">{display.label}</span>
          {isConnected ? (
            <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${
              connection?.isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-light text-text-muted'
            }`}>
              {connection?.isEnabled ? 'Connected' : 'Disabled'}
            </span>
          ) : (
            <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-surface-light text-text-muted">
              Not connected
            </span>
          )}
          {connection?.isDefault && (
            <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
              Default
            </span>
          )}
        </div>
        {isConnected && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs border border-surface-border text-text rounded px-2.5 py-1 hover:bg-surface-light transition-colors disabled:opacity-50"
              onClick={handleTest}
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test'}
            </button>
            {!connection?.isDefault && (
              <button
                type="button"
                className="text-xs text-text-muted hover:text-text-strong px-2.5 py-1 transition-colors"
                onClick={() => onUpdate({ isDefault: true })}
              >
                Set Default
              </button>
            )}
            <button
              type="button"
              className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1 transition-colors"
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {isConnected ? (
        <div className="flex flex-col gap-3">
          <div className="max-w-[400px]">
            <label className="block text-xs font-medium text-text-muted mb-1">Model</label>
            <select
              value={isCustom ? CUSTOM_MODEL_ID : (connection?.selectedModel || config.defaultModel)}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2 text-sm text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            >
              {config.models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          {isCustom && (
            <div className="max-w-[400px]">
              <label className="block text-xs font-medium text-text-muted mb-1">Custom Model ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. claude-sonnet-4-20250514"
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2 text-sm text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  onClick={handleCustomModelSave}
                  disabled={!customModelId.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder={`Enter ${display.label} API key`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2 pr-14 text-sm text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-strong cursor-pointer px-1"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="max-w-[400px]">
            <label className="block text-xs font-medium text-text-muted mb-1">Model</label>
            <select
              value={isCustom ? CUSTOM_MODEL_ID : selectedModel}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2 text-sm text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            >
              {config.models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          {isCustom && (
            <div className="max-w-[400px]">
              <label className="block text-xs font-medium text-text-muted mb-1">Custom Model ID</label>
              <input
                type="text"
                placeholder="e.g. claude-sonnet-4-20250514"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2 text-sm text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          )}
          <div>
            <button
              type="button"
              className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              onClick={() => {
                onConnect(apiKey, effectiveModel || undefined);
                setApiKey('');
              }}
              disabled={isConnecting || !apiKey || (isCustom && !customModelId.trim())}
            >
              {isConnecting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Connect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
