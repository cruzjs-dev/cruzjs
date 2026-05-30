import { cloudflareDevProxy } from '@react-router/dev/vite/cloudflare';
import { reactRouter } from '@react-router/dev/vite';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite-plus';

// __dirname shim for ESM context (needed when oxlint/oxfmt load this config)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.shared first, then .env for local overrides
dotenv.config({ path: '.env.shared' });
dotenv.config();

// Register TypeScript path aliases for runtime module resolution
import { register } from 'tsconfig-paths';
register({
  baseUrl: __dirname,
  paths: {
    '@/*': ['./apps/demo/src/*'],
    '@cruzjs/core': ['./packages/core/src/index.ts'],
    '@cruzjs/core/*': ['./packages/core/src/*'],
    '@cruzjs/start': ['./packages/start/src/index.ts'],
    '@cruzjs/start/*': ['./packages/start/src/*'],
    '@cruzjs/saas': ['./packages/saas/src/index.ts'],
    '@cruzjs/saas/*': ['./packages/saas/src/*'],
    '@cruzjs/ui': ['./packages/ui/src/index.ts'],
    '@cruzjs/ui/*': ['./packages/ui/src/*'],
  },
});

// Packages that must stay external for Workers (CommonJS/ESM issues)
const externalPackages: (string | RegExp)[] = [
  'pg', 'pg-native', 'pg-pool', 'pg-protocol', 'pg-types', 'pgpass',
  'reflect-metadata',
  // Google Cloud - Node.js only
  '@google-cloud/aiplatform',
  /^@google-cloud\//,
  // AI SDKs - Node.js only
  '@anthropic-ai/sdk',
  /^@anthropic-ai\//,
  'openai',
  /^openai\//,
  'ai',
  /^ai\//,
  '@google/generative-ai',
  /^@google\//,
  '@ai-sdk/anthropic',
  '@ai-sdk/google',
  '@ai-sdk/openai',
  /^@ai-sdk\//,
  'langchain',
  /^langchain\//,
  '@langchain/core',
  '@langchain/community',
  '@langchain/anthropic',
  '@langchain/google-genai',
  '@langchain/openai',
  /^@langchain\//,
  'zod-to-json-schema',
  // Drizzle ORM - only externalize Node.js-specific dialects
  // Keep drizzle-orm/d1 bundled for Cloudflare D1 support
  'drizzle-orm/better-sqlite3',
  'drizzle-orm/bun-sqlite',
  'drizzle-orm/libsql',
  'drizzle-orm/sql.js',
  'drizzle-orm/node-postgres',
  'drizzle-orm/postgres-js',
  'drizzle-orm/neon-serverless',
  'drizzle-orm/neon-http',
  'drizzle-orm/mysql2',
  'drizzle-orm/planetscale-serverless',
  'drizzle-kit',
  // HTML parsing packages with CommonJS require() calls - use regex to catch all
  'cheerio',
  /^cheerio/,
  'htmlparser2',
  /^htmlparser2/,
  'html-to-text',
  /^html-to-text/,
  '@selderee/plugin-htmlparser2',
  'parse5',
  /^parse5/,
  'dom-serializer',
  'domhandler',
  'domutils',
  'entities',
  'css-select',
  'css-what',
  'nth-check',
  'boolbase',
  'deepmerge',
  'selderee',
  'leac',
];

// Helper to check if a module ID matches external packages
function isExternal(id: string): boolean {
  return externalPackages.some((pattern) => {
    if (typeof pattern === 'string') {
      return id === pattern || id.startsWith(pattern + '/');
    }
    return pattern.test(id);
  });
}

// Detect build mode without needing the function-form config (required for oxlint compat)
const isBuild = process.argv.some((a) => a === 'build');

if (process.env.LOCAL_DEV === 'true') {
  console.log('[Vite] Local development mode enabled (no wrangler)');
}

// https://vitejs.dev/config/
// NOTE: Object form (not function form) is required so oxlint/oxfmt can read lint/fmt sections.
export default defineConfig({
  publicDir: 'apps/demo/public',
  server: {
    port: 5000,
    watch: {
      ignored: ['**/.wrangler/**'],
    },
  },
  plugins: [
    cloudflareDevProxy({
      configPath: './apps/demo/wrangler.toml',
      // Persist to same location as wrangler CLI (relative to wrangler.toml location)
      persist: { path: './apps/demo/.wrangler/state/v3' },
    }),
    reactRouter(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/demo/src'),
      '@cruzjs/core': path.resolve(__dirname, './packages/core/src'),
      '@cruzjs/start': path.resolve(__dirname, './packages/start/src'),
      '@cruzjs/saas': path.resolve(__dirname, './packages/saas/src'),
      '@cruzjs/ui': path.resolve(__dirname, './packages/ui/src'),
    },
  },
  build: {
    rollupOptions: {
      // Externalize Node.js-only packages during SSR build
      external: (id: string) => isExternal(id),
    },
  },
  ssr: {
    // In build: also bundle @react-router packages to avoid module dedup issues
    noExternal: isBuild
      ? ['inversify', /^@cruzjs\//, /^@react-router\//]
      : ['inversify', /^@cruzjs\//],
    // Rolldown only accepts string[] (no RegExp) in ssr.external
    external: externalPackages.filter((p): p is string => typeof p === 'string'),
  },
  optimizeDeps: {
    exclude: ['inversify'],
  },
  // VitePlus toolchain configuration
  lint: {},
  fmt: {
    singleQuote: true,
    semi: true,
  },
  staged: {
    '*.{ts,tsx}': ['vp lint --fix', 'vp fmt'],
  },
  run: {
    tasks: {
      'vp:db:migrate': { command: 'cruz db migrate', cache: false },
      'vp:db:generate': { command: 'cruz db generate', cache: false },
      'vp:deploy': { command: 'cruz deploy', cache: false },
    },
  },
});
