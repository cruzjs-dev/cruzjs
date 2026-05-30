import { AppLayout } from '@cruzjs/start/layout/AppLayout';
import { useAuth } from '@cruzjs/core/auth/auth-provider';
import { LoadingState } from '@cruzjs/ui';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/trpc/client';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

type PdfRow = {
  id: string;
  name: string;
  status: string;
  sizeBytes: number;
  analysis: string | null;
  extractedText: string | null;
  error: string | null;
  createdAt: string;
};

type ChatMsg = { role: 'user' | 'assistant'; content: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function PdfsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = trpc.pdfs.list.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils?.();

  const selected = trpc.pdfs.get.useQuery(
    { id: selectedId ?? '' },
    { enabled: !!selectedId }
  );

  const upload = trpc.pdfs.upload.useMutation({
    onSuccess: (row: { id: string }) => {
      setError(null);
      if (fileRef.current) fileRef.current.value = '';
      list.refetch();
      utils?.pdfs?.list?.invalidate?.();
      setSelectedId(row.id);
    },
    onError: (e: { message?: string }) => setError(e.message ?? 'Upload failed'),
  });

  const remove = trpc.pdfs.delete.useMutation({
    onSuccess: () => {
      list.refetch();
      utils?.pdfs?.list?.invalidate?.();
      setSelectedId((cur) => cur);
    },
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth/login');
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

  const pdfs = (list.data ?? []) as PdfRow[];

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File too large (max 10 MB).');
      return;
    }
    try {
      const dataBase64 = await fileToBase64(file);
      upload.mutate({ name: file.name, dataBase64 });
    } catch {
      setError('Could not read the file.');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="py-2">
          <h1 className="text-xl font-semibold text-text-strong mb-1">PDF Analysis</h1>
          <p className="text-[13px] text-text-muted">
            Upload a PDF — it's stored in object storage, the text is extracted and analyzed by AI,
            and you can chat with the document.
          </p>
        </div>

        {/* Upload */}
        <div className="rounded-lg bg-surface border border-surface-border p-4 flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-text-strong">Upload a PDF</h2>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            data-testid="pdf-file"
            disabled={upload.isPending}
            onChange={onFileChange}
            className="text-[13px] text-text-strong file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-white file:px-4 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-primary-dark file:cursor-pointer"
          />
          {upload.isPending && (
            <p className="text-[12px] text-text-muted" data-testid="pdf-uploading">
              Uploading and analyzing… this can take a few seconds.
            </p>
          )}
          {error && (
            <p className="text-[12px] text-red-500" data-testid="pdf-error">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* List */}
          <div className="lg:col-span-1">
            <h2 className="text-[15px] font-semibold text-text-strong mb-3">
              Your PDFs ({pdfs.length})
            </h2>
            {list.isLoading ? (
              <LoadingState />
            ) : pdfs.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 px-4 gap-2 bg-surface rounded-lg border border-surface-border"
                data-testid="pdfs-empty"
              >
                <h3 className="text-sm font-semibold text-text-strong">No PDFs yet</h3>
                <p className="text-text-muted text-[13px] text-center">
                  Upload your first PDF above.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2" data-testid="pdfs-list">
                {pdfs.map((pdf) => (
                  <li key={pdf.id}>
                    <button
                      onClick={() => setSelectedId(pdf.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selectedId === pdf.id
                          ? 'border-primary bg-surface-lighter'
                          : 'border-surface-border bg-surface hover:bg-surface-lighter'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-text-strong text-[13px] truncate">
                          {pdf.name}
                        </span>
                        {pdf.status === 'error' && (
                          <span className="text-[10px] text-red-500 shrink-0">error</span>
                        )}
                      </div>
                      <span className="text-[11px] text-text-muted">
                        {(pdf.sizeBytes / 1024).toFixed(0)} KB
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail: analysis + chat */}
          <div className="lg:col-span-2">
            {!selectedId ? (
              <div className="flex items-center justify-center h-full min-h-[200px] rounded-lg border border-dashed border-surface-border text-text-muted text-[13px]">
                Select a PDF to see its analysis and chat with it.
              </div>
            ) : selected.isLoading || !selected.data ? (
              <LoadingState />
            ) : (
              <PdfDetail
                pdf={selected.data as PdfRow}
                onDelete={() => {
                  remove.mutate({ id: (selected.data as PdfRow).id });
                  setSelectedId(null);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function PdfDetail({ pdf, onDelete }: { pdf: PdfRow; onDelete: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset the chat when switching documents.
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [pdf.id]);

  const chat = trpc.pdfs.chat.useMutation({
    onSuccess: (reply: string) => {
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    },
    onError: (e: { message?: string }) => {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `Error: ${e.message ?? 'chat failed'}` },
      ]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, chat.isPending]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || chat.isPending) return;
    const history = messages.slice();
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    chat.mutate({ id: pdf.id, message: text, history });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-surface border border-surface-border p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="text-[15px] font-semibold text-text-strong truncate">{pdf.name}</h2>
          <button
            onClick={onDelete}
            data-testid="pdf-delete"
            className="text-[12px] text-text-muted hover:text-red-500 transition-colors shrink-0"
          >
            Delete
          </button>
        </div>
        {pdf.status === 'error' ? (
          <p className="text-[13px] text-red-500" data-testid="pdf-analysis-error">
            Analysis failed: {pdf.error}
          </p>
        ) : (
          <div
            className="text-[13px] text-text whitespace-pre-wrap leading-relaxed"
            data-testid="pdf-analysis"
          >
            {pdf.analysis || 'No analysis available.'}
          </div>
        )}
      </div>

      {/* Chat preview */}
      <div className="rounded-lg bg-surface border border-surface-border flex flex-col">
        <div className="px-4 py-2 border-b border-surface-border">
          <h3 className="text-[13px] font-semibold text-text-strong">Chat with this document</h3>
        </div>
        <div
          ref={scrollRef}
          data-testid="pdf-chat-log"
          className="flex flex-col gap-2 p-4 max-h-72 overflow-y-auto min-h-[120px]"
        >
          {messages.length === 0 && !chat.isPending && (
            <p className="text-[12px] text-text-muted">
              Ask a question about “{pdf.name}”.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] ${
                m.role === 'user'
                  ? 'self-end bg-primary text-white'
                  : 'self-start bg-surface-lighter text-text-strong'
              }`}
            >
              {m.content}
            </div>
          ))}
          {chat.isPending && (
            <div className="self-start bg-surface-lighter text-text-muted rounded-lg px-3 py-2 text-[13px]">
              Thinking…
            </div>
          )}
        </div>
        <form onSubmit={send} className="flex gap-2 p-3 border-t border-surface-border">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            data-testid="pdf-chat-input"
            placeholder="Ask about this document…"
            className="flex-1 rounded-md border border-surface-border bg-surface-light px-3 py-1.5 text-[13px] text-text-strong outline-none focus:border-primary"
          />
          <button
            type="submit"
            data-testid="pdf-chat-send"
            disabled={chat.isPending || !input.trim()}
            className="bg-primary text-white hover:bg-primary-dark text-[13px] font-medium rounded-md px-4 py-1.5 transition-colors disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
