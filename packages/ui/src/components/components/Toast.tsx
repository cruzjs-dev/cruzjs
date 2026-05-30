import { useCallback, useState, type ReactNode } from 'react';
import { ToastContext, type ToastOptions, type ToastContextValue } from '@cruzjs/core/shared/toast';

export type { ToastOptions, ToastContextValue };

type ToastStatus = 'success' | 'error' | 'info' | 'warning';

type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

type ToastItem = ToastOptions & { id: number };

type ToastProviderProps = {
  children: ReactNode;
  position?: ToastPosition;
  maxVisible?: number;
  stackGap?: number;
};

let nextId = 0;

const statusStyles: Record<ToastStatus, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
  warning: 'bg-amber-600',
};

const statusIcons: Record<ToastStatus, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  info: 'M12 8v4m0 4h.01',
  warning: 'M12 9v4m0 4h.01',
};

const positionClasses: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

function isBottomPosition(position: ToastPosition): boolean {
  return position.startsWith('bottom');
}

export function ToastProvider({
  children,
  position = 'top-right',
  maxVisible = 5,
  stackGap = 8,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((options: ToastOptions) => {
    const id = ++nextId;
    const duration = options.duration ?? 5000;
    setToasts((prev) => [...prev, { ...options, id }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const visibleToasts = toasts.slice(-maxVisible);
  const stackDirection = isBottomPosition(position) ? 'flex-col-reverse' : 'flex-col';

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div
        className={`fixed z-[9999] flex ${stackDirection} pointer-events-none ${positionClasses[position]}`}
        style={{ gap: `${stackGap}px` }}
      >
        {visibleToasts.map((t) => {
          const status = t.status ?? 'info';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 min-w-[320px] max-w-md rounded-lg px-4 py-3 text-white shadow-lg ${statusStyles[status]} animate-[slideIn_0.2s_ease-out]`}
            >
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d={statusIcons[status]} />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{t.title}</p>
                {t.description && (
                  <p className="text-sm opacity-90 mt-0.5">{t.description}</p>
                )}
              </div>
              {(t.isClosable ?? true) && (
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export { useToast } from '@cruzjs/core/shared/toast';
