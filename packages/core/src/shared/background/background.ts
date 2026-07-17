/**
 * Background task bridge.
 *
 * Cloudflare Workers (and other serverless runtimes) tear down as soon as the
 * response is returned, cancelling any fire-and-forget `void fetch(...)`. The
 * runtime gives you `context.waitUntil(promise)` to keep such work alive, but
 * that handle only exists at the request boundary — deep in a tRPC procedure or
 * service you no longer have it.
 *
 * This module captures `waitUntil` into an AsyncLocalStorage at the request
 * boundary (done automatically by the framework's tRPC/loader handlers) so any
 * downstream code can hand off background work with a single call:
 *
 *   import { runInBackground } from '@cruzjs/core/background';
 *
 *   runInBackground(notifyDiscord(payload)); // survives after the response
 *
 * When no `waitUntil` is available (local dev, non-CF runtimes) the promise is
 * simply left to run detached — never awaited on the request path.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

type WaitUntil = (promise: Promise<unknown>) => void;

const storage = new AsyncLocalStorage<{ waitUntil?: WaitUntil }>();

/**
 * Establish the background-task scope for a request. The framework calls this
 * around request handling; app code normally does not call it directly.
 */
export const runWithWaitUntil = <T>(waitUntil: WaitUntil | undefined, fn: () => T): T =>
  storage.run({ waitUntil }, fn);

/**
 * Hand off a promise to run after the response returns.
 *
 * Uses the runtime's `waitUntil` when available so the work is not cancelled;
 * otherwise the promise runs detached. Never throws and never blocks the caller.
 */
export const runInBackground = (promise: Promise<unknown>): void => {
  const waitUntil = storage.getStore()?.waitUntil;
  // Swallow rejections so a failed background task never surfaces as an
  // unhandled rejection that could crash the isolate.
  const guarded = Promise.resolve(promise).catch((err) => {
    console.error('[background] task failed:', err);
  });
  if (waitUntil) {
    waitUntil(guarded);
    return;
  }
  void guarded;
};

/** Extract a `waitUntil` handle from a React Router / CF load context, if present. */
export const getWaitUntilFromContext = (loadContext: unknown): WaitUntil | undefined => {
  const ctx = loadContext as { waitUntil?: WaitUntil } | undefined;
  return typeof ctx?.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : undefined;
};
