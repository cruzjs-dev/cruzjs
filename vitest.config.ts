import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Stub ioredis — not installed in this CF project. Prevents vite:import-analysis
      // from failing when redis.service.ts is in a transitive import chain.
      { find: 'ioredis', replacement: path.resolve(__dirname, './tests/__mocks__/ioredis.ts') },
      { find: '@/tests', replacement: path.resolve(__dirname, './tests') },
      { find: '@', replacement: path.resolve(__dirname, './apps/demo/src') },
      // @cruzjs/core/* must come before @cruzjs/core to allow sub-path imports
      {
        find: /^@cruzjs\/core\/(.+)/,
        replacement: path.resolve(__dirname, './packages/core/src/$1'),
      },
      {
        find: '@cruzjs/core',
        replacement: path.resolve(__dirname, './packages/core/src/index.ts'),
      },
      {
        find: /^@cruzjs\/saas\/(.+)/,
        replacement: path.resolve(__dirname, './packages/saas/src/$1'),
      },
      {
        find: '@cruzjs/saas',
        replacement: path.resolve(__dirname, './packages/saas/src/index.ts'),
      },
      {
        find: /^@cruzjs\/start\/(.+)/,
        replacement: path.resolve(__dirname, './packages/start/src/$1'),
      },
      {
        find: '@cruzjs/start',
        replacement: path.resolve(__dirname, './packages/start/src/index.ts'),
      },
      {
        find: /^@cruzjs\/monitor\/(.+)/,
        replacement: path.resolve(__dirname, './packages/monitor/src/$1'),
      },
      {
        find: '@cruzjs/monitor',
        replacement: path.resolve(__dirname, './packages/monitor/src/index.ts'),
      },
      {
        find: '@cruzjs/adapter-cloudflare',
        replacement: path.resolve(__dirname, './packages/adapter-cloudflare/src/index.ts'),
      },
      {
        find: '@cruzjs/adapter-aws',
        replacement: path.resolve(__dirname, './packages/adapter-aws/src/index.ts'),
      },
      {
        find: '@cruzjs/adapter-gcp',
        replacement: path.resolve(__dirname, './packages/adapter-gcp/src/index.ts'),
      },
      {
        find: '@cruzjs/adapter-azure',
        replacement: path.resolve(__dirname, './packages/adapter-azure/src/index.ts'),
      },
      {
        find: '@cruzjs/adapter-digitalocean',
        replacement: path.resolve(__dirname, './packages/adapter-digitalocean/src/index.ts'),
      },
      {
        find: '@cruzjs/adapter-docker',
        replacement: path.resolve(__dirname, './packages/adapter-docker/src/index.ts'),
      },
      {
        find: /^@cruzjs\/drizzle-universal\/(.+)/,
        replacement: path.resolve(__dirname, './packages/drizzle-universal/src/$1'),
      },
      {
        find: '@cruzjs/drizzle-universal',
        replacement: path.resolve(__dirname, './packages/drizzle-universal/src/index.ts'),
      },
      {
        find: /^@cruzjs\/ai\/(.+)/,
        replacement: path.resolve(__dirname, './packages/ai/src/$1'),
      },
      {
        find: '@cruzjs/ai',
        replacement: path.resolve(__dirname, './packages/ai/src/index.ts'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/libs/core/email/templates/**',
      '**/tests/e2e/**',
      '**/tests/e2e',
      '**/tests/**/*.example.test.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/build/',
        'workers/',
        '**/libs/core/email/templates/**',
      ],
    },
  },
});
