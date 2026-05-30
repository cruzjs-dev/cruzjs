import { CruzProviders } from '@cruzjs/core/framework/components';
import { AuthProvider } from '@cruzjs/core/auth/auth-provider';
import { ToastProvider } from '@cruzjs/ui';
import { trpc, createTRPCClient, createQueryClient } from '@/trpc/client';
import { theme } from '@/theme';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from 'react-router';
import './index.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <CruzProviders
      trpc={trpc}
      createClient={createTRPCClient}
      createQueryClient={createQueryClient}
      theme={theme}
    >
      <AuthProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </AuthProvider>
    </CruzProviders>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details = error.status === 404
      ? 'The requested page could not be found.'
      : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">{message}</h1>
      <p className="mt-2 text-gray-600">{details}</p>
      {stack && (
        <pre className="mt-4 p-4 bg-gray-100 overflow-x-auto text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
