import type { Plugin } from 'vite';

const VIRTUAL_ID = '\0server-only';

/**
 * Vite plugin that enforces server-only module boundaries.
 *
 * Any file that contains `import 'server-only'` will throw a build-time error
 * if it's ever included in the client bundle — providing an explicit guard for
 * modules that must never run in a browser (services, middleware, DI containers, etc.).
 *
 * In SSR builds the import is a no-op.
 *
 * Usage in vite.config.ts:
 *   import { serverOnlyPlugin } from '@cruzjs/core/vite';
 *   plugins: [serverOnlyPlugin(), reactRouter(), ...]
 */
export function serverOnlyPlugin(): Plugin {
  return {
    name: 'cruzjs:server-only',
    enforce: 'pre',

    resolveId(id) {
      if (id === 'server-only') {
        return VIRTUAL_ID;
      }
    },

    load(id, options) {
      if (id !== VIRTUAL_ID) return;

      if (options?.ssr) {
        // Server context — no-op
        return `export default undefined;`;
      }

      // Client context — fail loudly
      return `throw new Error(
  '[cruzjs] A server-only module was imported in the client bundle.\\n' +
  'Check your loaders and actions for static imports of services, ' +
  'middleware, or other server-only code.\\n' +
  'See: https://reactrouter.com/explanation/server-vs-client-code'
);`;
    },
  };
}
