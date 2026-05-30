import { cloudflareDevProxy } from '@react-router/dev/vite/cloudflare';
import { reactRouter } from '@react-router/dev/vite';
import { serverOnlyPlugin } from '@cruzjs/core/vite';
import tailwindcss from '@tailwindcss/vite';
import babel from 'vite-plugin-babel';
import dotenv from 'dotenv';
import * as path from 'path';
import { defineConfig } from 'vite-plus';

dotenv.config();

// Packages that must stay external for Workers (CommonJS/ESM issues)
const externalPackages: (string | RegExp)[] = [
  'pg', 'pg-native', 'pg-pool', 'pg-protocol', 'pg-types', 'pgpass',
  'reflect-metadata',
  'better-sqlite3',
  'ioredis',
  /^ioredis\//,
  '@google-cloud/aiplatform',
  /^@google-cloud\//,
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

function isExternal(id: string): boolean {
  return externalPackages.some((pattern) => {
    if (typeof pattern === 'string') {
      return id === pattern || id.startsWith(pattern + '/');
    }
    return pattern.test(id);
  });
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    server: {
      port: 5000,
      watch: {
        ignored: ['**/.wrangler/**'],
      },
    },
    plugins: [
      tailwindcss(),
      serverOnlyPlugin(),
      babel({
        filter: /\.[jt]sx?$/,
        include: [/\/src\//, /@cruzjs\//],
        optimizeOnSSR: true,
        babelConfig: {
          babelrc: false,
          configFile: false,
          plugins: [
            ['@babel/plugin-syntax-typescript', { allExtensions: true, isTSX: true }],
            'babel-plugin-transform-typescript-metadata',
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            ['@babel/plugin-transform-class-properties', { loose: true }],
          ],
        },
      }),
      cloudflareDevProxy({
        configPath: './wrangler.dev.toml',
        persist: { path: './.wrangler/state/v3' },
      }),
      reactRouter(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rolldownOptions: {
        external: (id: string) => isExternal(id),
      },
      rollupOptions: {
        external: (id: string) => isExternal(id),
      },
    },
    ssr: {
      noExternal: isBuild
        ? ['inversify', /^@cruzjs\//, /^@react-router\//]
        : ['inversify', /^@cruzjs\//],
      external: externalPackages.filter((p): p is string => typeof p === 'string'),
    },
    optimizeDeps: {
      exclude: ['inversify'],
    },
  };
});
