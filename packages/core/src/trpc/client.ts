import { QueryClient } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AnyRouter } from '@trpc/server';

/**
 * The return type of createTRPCReact — typed as the most specific generic
 * we can express without knowing the concrete router at compile time.
 */
type TRPCReactHooks = ReturnType<typeof createTRPCReact<AnyRouter>>;

/**
 * Create typed tRPC React hooks for the given router
 */
export function createTRPCHooks<TRouter extends AnyRouter>() {
  return createTRPCReact<TRouter>();
}

export type HeadersFactory = () => Record<string, string>;

/**
 * Create a tRPC client with auth headers and optional custom headers
 */
export function createTRPCClientFactory<TRouter extends AnyRouter>(
  trpcHooks: ReturnType<typeof createTRPCReact<TRouter>>,
  options?: {
    url?: string;
    extraHeaders?: HeadersFactory;
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- createTRPCReact's generic return type doesn't expose createClient in a way that preserves the TRouter parameter
  return (trpcHooks as any).createClient({
    links: [
      httpBatchLink({
        url: options?.url ?? '/api/trpc',
        // Browser sends HttpOnly auth_token cookie automatically (same-origin fetch).
        // extraHeaders is for org context, locale, etc. — not auth.
        headers: () => ({
          ...options?.extraHeaders?.(),
        }),
      }),
    ],
  });
}

/**
 * Create a QueryClient with sensible defaults
 */
export function createDefaultQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Global tRPC hooks registry.
 *
 * Package components (in @cruzjs/core, @cruzjs/saas, @cruzjs/start) cannot import the
 * app's typed `trpc` directly. Instead, the app registers its tRPC hooks at
 * startup and package components access them via `getTRPC()`.
 *
 * Usage in app (root.tsx):
 *   import { registerTRPC } from '@cruzjs/core/trpc/client';
 *   registerTRPC(trpc);
 *
 * Usage in package components:
 *   import { getTRPC } from '@cruzjs/core/trpc/client';
 *   const trpc = getTRPC();
 *   const { data } = trpc.auth.session.useQuery();
 */
let _trpcHooksInstance: TRPCReactHooks | null = null;

export function registerTRPC(trpc: TRPCReactHooks) {
  _trpcHooksInstance = trpc;
}

/** Alias for `registerTRPC` — preferred name going forward. */
export const setTRPC = registerTRPC;

export function getTRPC(): TRPCReactHooks {
  if (!_trpcHooksInstance) {
    throw new Error(
      'tRPC hooks not registered. Call registerTRPC(trpc) in your root.tsx before rendering.'
    );
  }
  return _trpcHooksInstance;
}
