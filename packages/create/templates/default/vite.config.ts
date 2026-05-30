import { cloudflareDevProxy } from '@react-router/dev/vite/cloudflare';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import babel from 'vite-plugin-babel';
import * as path from 'path';
import { defineConfig } from 'vite-plus';

const externalPackages = [
  'reflect-metadata',
  'better-sqlite3',
  'drizzle-orm/better-sqlite3',
  'drizzle-orm/bun-sqlite',
  'drizzle-orm/libsql',
  'drizzle-orm/node-postgres',
  'drizzle-orm/postgres-js',
  'drizzle-kit',
];

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    server: {
      port: 5000,
      watch: {
        // Ignore wrangler D1 sqlite WAL/SHM writes — otherwise every DB query triggers HMR reload
        ignored: ['**/.wrangler/**', '**/.cruz/**', '**/node_modules/**'],
      },
    },
    plugins: [
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
      tailwindcss(),
      cloudflareDevProxy({ configPath: './wrangler.dev.toml', persist: { path: './.wrangler/state/v3' } }),
      reactRouter(),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      rolldownOptions: {
        external: (id: string) =>
          externalPackages.some((p) => id === p || id.startsWith(p + '/')),
      },
    },
    ssr: {
      // @chakra-ui/* and @emotion/* must be noExternal so Vite bundles them
      // with consistent module instances for SSR. If they're left as external,
      // Vite's pre-bundled browser deps cache and Node.js native loading produce
      // two separate @emotion/react ThemeContext instances — Chakra's ThemeProvider
      // sets one, but emotion-styled reads the other, so theme tokens are never
      // resolved (e.g. `border-radius:2xl` instead of `var(--chakra-radii-2xl)`).
      noExternal: isBuild
        ? ['inversify', /^@cruzjs\//, /^@react-router\//, /^@chakra-ui\//, /^@emotion\//, 'framer-motion']
        : ['inversify', /^@cruzjs\//, /^@chakra-ui\//, /^@emotion\//, 'framer-motion'],
      external: externalPackages,
    },
    optimizeDeps: {
      exclude: ['inversify', '@cruzjs/core', '@cruzjs/start', '@cruzjs/saas', '@cruzjs/ui'],
    },
  };
});
