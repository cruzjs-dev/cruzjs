import { AppLayout } from '@cruzjs/start/layout/AppLayout';
import { useAuth } from '@cruzjs/core/auth/auth-provider';
import { LoadingState } from '@cruzjs/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/trpc/client';

export default function ChatbotsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [error, setError] = useState<string | null>(null);

  const list = trpc.chatbots.list.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils?.();

  const create = trpc.chatbots.create.useMutation({
    onSuccess: () => {
      setName('');
      setSystemPrompt('You are a helpful assistant.');
      setError(null);
      list.refetch();
      utils?.chatbots?.list?.invalidate?.();
    },
    onError: (e: { message?: string }) => setError(e.message ?? 'Failed to create chatbot'),
  });

  const remove = trpc.chatbots.delete.useMutation({
    onSuccess: () => {
      list.refetch();
      utils?.chatbots?.list?.invalidate?.();
    },
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingState size="xl" />
        </div>
      </AppLayout>
    );
  }

  const chatbots = (list.data ?? []) as Array<{
    id: string;
    name: string;
    systemPrompt: string;
    model: string;
    createdAt: string;
  }>;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    create.mutate({ name: name.trim(), systemPrompt: systemPrompt.trim() || undefined });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="py-2">
          <h1 className="text-xl font-semibold text-text-strong mb-1">Chatbots</h1>
          <p className="text-[13px] text-text-muted">
            Create and manage your chatbots.
          </p>
        </div>

        {/* Create form */}
        <form
          onSubmit={onSubmit}
          className="rounded-lg bg-surface border border-surface-border p-4 flex flex-col gap-3"
        >
          <h2 className="text-[15px] font-semibold text-text-strong">New chatbot</h2>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-text-muted font-medium" htmlFor="cb-name">
              Name
            </label>
            <input
              id="cb-name"
              data-testid="chatbot-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Support Bot"
              className="rounded-md border border-surface-border bg-surface-light px-3 py-1.5 text-[13px] text-text-strong outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-text-muted font-medium" htmlFor="cb-prompt">
              System prompt
            </label>
            <textarea
              id="cb-prompt"
              data-testid="chatbot-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
              className="rounded-md border border-surface-border bg-surface-light px-3 py-1.5 text-[13px] text-text-strong outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-[12px] text-red-500" data-testid="chatbot-error">{error}</p>}
          <div>
            <button
              type="submit"
              data-testid="chatbot-submit"
              disabled={create.isPending}
              className="inline-flex items-center gap-2 bg-primary text-white hover:bg-primary-dark text-[13px] font-medium rounded-md px-4 py-1.5 transition-colors disabled:opacity-60"
            >
              {create.isPending ? 'Creating…' : 'Create chatbot'}
            </button>
          </div>
        </form>

        {/* List */}
        <div>
          <h2 className="text-[15px] font-semibold text-text-strong mb-3">
            Your chatbots ({chatbots.length})
          </h2>
          {list.isLoading ? (
            <LoadingState />
          ) : chatbots.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 px-4 gap-2 bg-surface rounded-lg border border-surface-border"
              data-testid="chatbots-empty"
            >
              <h3 className="text-sm font-semibold text-text-strong">No chatbots yet</h3>
              <p className="text-text-muted text-[13px]">Create your first chatbot above.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="chatbots-list">
              {chatbots.map((bot) => (
                <li
                  key={bot.id}
                  className="rounded-lg bg-surface border border-surface-border p-4 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-text-strong text-sm">{bot.name}</p>
                    <button
                      onClick={() => remove.mutate({ id: bot.id })}
                      className="text-[12px] text-text-muted hover:text-red-500 transition-colors"
                      aria-label={`Delete ${bot.name}`}
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-[12px] text-text-muted line-clamp-2">{bot.systemPrompt}</p>
                  <code className="text-[11px] text-text-muted font-mono">{bot.model}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
