/**
 * REST API Catch-All Route
 *
 * React Router v7 catch-all handler for REST API router requests.
 * Registered as `api/*` — handles all `/api/*` requests that don't match
 * more specific routes (trpc, health, etc.).
 *
 * Modules are resolved from the global registry set by createCruzApp.
 */

import 'reflect-metadata';
import { handleApiRequest } from './api.handler';
import { handleCruzLoader, handleCruzAction } from '../routing';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';

const notFound = () =>
  new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not Found' } }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ request }) => {
    const response = await handleApiRequest(request, args.context);
    return response ?? notFound();
  });

export const action = async (args: ActionFunctionArgs) =>
  handleCruzAction([args], async ({ request }) => {
    const response = await handleApiRequest(request, args.context);
    return response ?? notFound();
  });

/**
 * Create a React Router loader handler for the REST API catch-all.
 *
 * @example
 * ```typescript
 * // apps/web/src/routes/api/api.$.ts
 * export const loader = createApiLoaderHandler();
 * export const action = createApiActionHandler();
 * ```
 */
export function createApiLoaderHandler() {
  return async (args: LoaderFunctionArgs) =>
    handleCruzLoader([args], async ({ request }) => {
      const response = await handleApiRequest(request, args.context);
      return response ?? notFound();
    });
}

export function createApiActionHandler() {
  return async (args: ActionFunctionArgs) =>
    handleCruzAction([args], async ({ request }) => {
      const response = await handleApiRequest(request, args.context);
      return response ?? notFound();
    });
}
