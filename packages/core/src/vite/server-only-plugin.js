const VIRTUAL_ID = '\0server-only';

export function serverOnlyPlugin() {
  return {
    name: 'cruzjs:server-only',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'server-only') return VIRTUAL_ID;
    },
    load(id, options) {
      if (id !== VIRTUAL_ID) return;
      if (options?.ssr) return `export default undefined;`;
      return `throw new Error('[cruzjs] A server-only module was imported in the client bundle.');`;
    },
  };
}
