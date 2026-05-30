import { handleTRPCRequest } from './handler';
import { handleCruzLoader, handleCruzAction } from '../routing';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

/**
 * tRPC API route handler for React Router 7
 * Handles all tRPC requests at /api/trpc/*
 *
 * Usage in routes.ts:
 *   import { trpcRoute } from '@cruzjs/core/trpc/trpc.route';
 *   route('trpc/*', trpcRoute)
 *
 * Or for file-based routing, re-export in your routes folder:
 *   export { loader, action } from '@cruzjs/core/trpc/trpc.route';
 *
 * Or use the factory functions for one-liners:
 *   export const loader = createTRPCLoaderHandler();
 *   export const action = createTRPCActionHandler();
 */
export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ request, params }) => {
    return handleTRPCRequest(request, params, args.context);
  });

export const action = async (args: ActionFunctionArgs) =>
  handleCruzAction([args], async ({ request, params }) => {
    return handleTRPCRequest(request, params, args.context);
  });

/**
 * Create a React Router loader handler for tRPC.
 *
 * @example
 * ```typescript
 * // apps/web/src/routes/api/trpc.$.ts
 * export const loader = createTRPCLoaderHandler();
 * export const action = createTRPCActionHandler();
 * ```
 */
export function createTRPCLoaderHandler() {
  return async (args: LoaderFunctionArgs) =>
    handleCruzLoader([args], async ({ request, params }) => {
      return handleTRPCRequest(request, params, args.context);
    });
}

export function createTRPCActionHandler() {
  return async (args: ActionFunctionArgs) =>
    handleCruzAction([args], async ({ request, params }) => {
      return handleTRPCRequest(request, params, args.context);
    });
}
