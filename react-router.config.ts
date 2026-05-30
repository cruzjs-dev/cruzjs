import type { Config } from '@react-router/dev/config';

/**
 * Root-level React Router config for monorepo development.
 * Points to apps/demo as the application source.
 *
 * For standalone use, see apps/demo/react-router.config.ts
 */
export default {
  ssr: true,
  appDirectory: 'apps/demo/src',
  buildDirectory: 'dist',
  future: {
    unstable_optimizeDeps: true,
  },
} satisfies Config;
