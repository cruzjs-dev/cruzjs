/**
 * React Router virtual module declarations
 * Used by the Cloudflare Pages/Workers server handler
 */
declare module 'virtual:react-router/server-build' {
  import type { ServerBuild } from 'react-router';
  const build: ServerBuild;
  export default build;
}
