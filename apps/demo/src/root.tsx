import { CruzProviders, DevErrorPage, NotFoundPage, ProdErrorPage } from '@cruzjs/core/framework/components';
import { AuthProvider } from '@cruzjs/core/auth/auth-provider';
import { CruzSaasProviders } from '@cruzjs/saas/providers/CruzSaasProviders';
import { trpc, createTRPCClient, createQueryClient } from '@/trpc/client';
import { appConfig } from '@/config/app.config';
import { ToastProvider } from '@cruzjs/ui';

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from 'react-router';
import { Suspense } from 'react';

import './index.css';

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <CruzSaasProviders>
      <CruzProviders
        trpc={trpc as any}
        createClient={createTRPCClient as any}
        createQueryClient={createQueryClient}
      >
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </CruzProviders>
    </CruzSaasProviders>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-surface-light">
      <div className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-surface-border">
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center h-11">
          <span className="text-[13px] font-semibold text-text-strong">{appConfig.name ?? 'CruzJS'}</span>
        </div>
      </div>
      <div className="max-w-screen-2xl mx-auto px-6 pt-12 pb-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,300..700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <Meta />
        <Links />
        <title>{appConfig.name}</title>
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
    <AuthShell>
      <Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </Suspense>
    </AuthShell>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const isDev = import.meta.env.DEV;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFoundPage />;
    }
    return isDev
      ? <DevErrorPage error={new Error(error.data || error.statusText)} statusCode={error.status} />
      : <ProdErrorPage statusCode={error.status} />;
  }

  return isDev
    ? <DevErrorPage error={error} statusCode={500} />
    : <ProdErrorPage statusCode={500} />;
}
