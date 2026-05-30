import { useToast } from '@cruzjs/ui';
import { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';
import type { ApiKeyCreatedResponse } from '../api-key.types';
import type { ApiKeyScope } from '../../database/schema';

type CreateApiKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const SCOPE_OPTIONS: { value: ApiKeyScope; label: string; description: string }[] = [
  { value: 'READ', label: 'Read', description: 'Read work items, projects, and settings' },
  { value: 'WRITE', label: 'Write', description: 'Create and update work items and projects' },
  { value: 'ADMIN', label: 'Admin', description: 'Full access including settings and API keys' },
];

const EXPIRATION_OPTIONS = [
  { value: '', label: 'Never expires' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

export const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const trpc = getTRPC();
  const toast = useToast();

  // Form state
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiration, setExpiration] = useState('');
  const [nameError, setNameError] = useState('');
  const [scopeError, setScopeError] = useState('');

  // Result state
  const [createdKey, setCreatedKey] = useState<ApiKeyCreatedResponse | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const createMutation = trpc.apiKey.create.useMutation({
    onSuccess: (data: any) => {
      setCreatedKey(data);
      onCreated();
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating API key',
        description: error.message || 'Failed to create API key',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const validateForm = (): boolean => {
    let valid = true;
    setNameError('');
    setScopeError('');

    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else if (name.length > 100) {
      setNameError('Name must be 100 characters or fewer');
      valid = false;
    }

    if (scopes.length === 0) {
      setScopeError('Select at least one scope');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    let expiresAt: string | null = null;
    if (expiration) {
      const days = parseInt(expiration, 10);
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }

    await createMutation.mutateAsync({
      name: name.trim(),
      scopes: scopes as ApiKeyScope[],
      projectScope: null,
      expiresAt,
    });
  };

  const handleCopyKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.plainTextKey);
      setHasCopied(true);
      toast({
        title: 'API key copied',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please select and copy the key manually.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleClose = () => {
    if (createdKey && !hasCopied) {
      // Don't close until user acknowledges they've copied the key
      return;
    }
    resetForm();
    onClose();
  };

  const handleDismissKeyWarning = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setScopes([]);
    setExpiration('');
    setNameError('');
    setScopeError('');
    setCreatedKey(null);
    setHasCopied(false);
  };

  const toggleScope = (scopeValue: string) => {
    setScopes((prev) =>
      prev.includes(scopeValue)
        ? prev.filter((s) => s !== scopeValue)
        : [...prev, scopeValue]
    );
  };

  if (!isOpen) return null;

  // If key was just created, show the key display view
  if (createdKey) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative w-full max-w-lg mx-4 bg-surface rounded-xl shadow-xl">
          <div className="px-6 py-4 border-b border-surface-border">
            <h2 className="text-lg font-semibold text-text-strong">API Key Created</h2>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-amber-800">
                This is the only time you will see this key. Copy it now and store it securely.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-strong mb-1.5">API Key</label>
              <div className="p-3 bg-surface-light border border-surface-border rounded-lg overflow-x-auto">
                <code className="block text-sm font-mono text-emerald-500 whitespace-nowrap">
                  {createdKey.plainTextKey}
                </code>
              </div>
            </div>

            <button
              type="button"
              className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors inline-flex items-center gap-2 self-start"
              onClick={handleCopyKey}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {hasCopied ? 'Copied' : 'Copy to Clipboard'}
            </button>

            <p className="text-xs text-text-muted">
              Key name: {createdKey.name} | Prefix: {createdKey.keyPrefix}...
            </p>
          </div>

          <div className="px-6 py-4 border-t border-surface-border flex justify-end">
            <button
              type="button"
              className={
                hasCopied
                  ? 'bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors'
                  : 'border border-surface-border text-text rounded-lg px-5 py-2.5 font-medium hover:bg-surface-light transition-colors'
              }
              onClick={handleDismissKeyWarning}
            >
              {hasCopied ? 'Done' : "I've copied the key"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-lg mx-4 bg-surface rounded-xl shadow-xl">
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-strong">Create API Key</h2>
          <button
            type="button"
            className="text-text-muted hover:text-text-strong transition-colors"
            onClick={handleClose}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Name field */}
          <div>
            <label className="block text-sm font-medium text-text-strong mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CI/CD Pipeline, Development Agent"
              className={`w-full rounded-lg border px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors bg-surface ${
                nameError ? 'border-red-400' : 'border-surface-border'
              }`}
            />
            {nameError && (
              <p className="mt-1 text-xs text-red-500">{nameError}</p>
            )}
          </div>

          {/* Scopes field */}
          <div>
            <label className="block text-sm font-medium text-text-strong mb-1.5">Scopes</label>
            <div className="flex flex-col gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopes.includes(opt.value)}
                    onChange={() => toggleScope(opt.value)}
                    className="mt-0.5 h-4 w-4 rounded border-surface-border text-primary focus:ring-primary/30"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text-strong">{opt.label}</span>
                    <span className="text-xs text-text-muted">{opt.description}</span>
                  </div>
                </label>
              ))}
            </div>
            {scopeError && (
              <p className="mt-1 text-xs text-red-500">{scopeError}</p>
            )}
          </div>

          {/* Expiration field */}
          <div>
            <label className="block text-sm font-medium text-text-strong mb-1.5">Expiration</label>
            <select
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            >
              {EXPIRATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
          <button
            type="button"
            className="text-text hover:bg-surface-light rounded-lg px-5 py-2.5 font-medium transition-colors"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {createMutation.isPending ? 'Creating...' : 'Create API Key'}
          </button>
        </div>
      </div>
    </div>
  );
};
