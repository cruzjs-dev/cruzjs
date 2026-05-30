import { createContext, useContext } from 'react';

export type ToastOptions = {
  title: string;
  description?: string;
  status?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  isClosable?: boolean;
};

export type ToastContextValue = (options: ToastOptions) => void;

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}
