/**
 * useFlash Hook
 *
 * Client-side hook to read flash messages from loader data.
 *
 * Loaders should return flash messages under a `flash` key:
 * ```typescript
 * export const loader = async (args: LoaderFunctionArgs) =>
 *   handleCruzLoader([args], async ({ request, container }) => {
 *     const flash = container.resolve(FlashService);
 *     flash.init(request);
 *     const messages = flash.consume();
 *     return { data: ..., flash: messages };
 *   });
 * ```
 *
 * Then in the component:
 * ```typescript
 * const flash = useFlash();
 * // flash is FlashMessage[]
 * ```
 */

import { useRouteLoaderData, useMatches } from 'react-router';
import type { FlashMessage } from '@cruzjs/core';

/**
 * Read flash messages from the nearest route loader data.
 *
 * Searches the current route and parent routes for a `flash` property
 * in the loader data. Returns the first non-empty array found.
 */
export function useFlash(): FlashMessage[] {
  const matches = useMatches();

  // Walk matches in reverse (most specific route first)
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const data = match?.data as Record<string, unknown> | undefined;

    if (data && 'flash' in data && Array.isArray(data.flash)) {
      return data.flash as FlashMessage[];
    }
  }

  return [];
}
