#!/usr/bin/env -S npx tsx
/**
 * @cruzjs/create
 *
 * Scaffold a new CruzJS application.
 *
 * Usage:
 *   npm create @cruzjs my-app
 *   npm create @cruzjs my-app -- --saas
 *   npm create @cruzjs my-app -- --with-pro
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { setupSaas } from './setup/saas-setup';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Options {
  projectName: string;
  withPro: boolean;
  withStart: boolean;
  saas: boolean;
  skipInstall: boolean;
}

async function promptSaasOrFramework(): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    console.log('\nWhat are you building?');
    console.log('  [1] Framework app (no billing)');
    console.log('  [2] SaaS (with billing, orgs, subscription)\n');
    rl.question('Choose [1/2]: ', (answer) => {
      rl.close();
      resolve(answer.trim() === '2');
    });
  });
}

async function parseArgs(args: string[]): Promise<Options> {
  const positional = args.filter(a => !a.startsWith('--'));
  const flags = args.filter(a => a.startsWith('--'));

  const projectName = positional[0];
  if (!projectName) {
    console.error('Usage: npm create @cruzjs <project-name> -- [--saas] [--with-pro] [--core-only]');
    process.exit(1);
  }

  const coreOnly = flags.includes('--core-only');
  const skipInstall = flags.includes('--skip-install');

  let saas = flags.includes('--saas');

  if (!saas && !coreOnly && !flags.includes('--with-pro') && process.stdin.isTTY) {
    saas = await promptSaasOrFramework();
  }

  return {
    projectName,
    saas,
    withPro: !coreOnly && (flags.includes('--with-pro') || saas),
    withStart: !coreOnly,
    skipInstall,
  };
}

function copyTemplate(templateDir: string, targetDir: string): void {
  if (!fs.existsSync(templateDir)) {
    console.error(`Template directory not found: ${templateDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    const destPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyTemplate(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function generatePackageJson(options: Options): string {
  const deps: Record<string, string> = {
    '@chakra-ui/react': '^2.8.0',
    '@cruzjs/core': '^0.1.17',
    '@cruzjs/drizzle-universal': '^0.1.0',
    '@cruzjs/ui': '^0.1.3',
    '@emotion/react': '^11',
    '@emotion/styled': '^11',
    '@paralleldrive/cuid2': '^2.2.2',
    '@trpc/server': '^11.7.1',
    'drizzle-orm': '^0.36.4',
    'framer-motion': '^10',
    'inversify': '^7.10.4',
    'react': '^18.2.0',
    'react-dom': '^18.3.1',
    'react-router': '^7.11.0',
    'reflect-metadata': '^0.2.2',
    'zod': '^4.1.12',
  };

  // StartModule depends on saas — both always included for a working scaffold
  deps['@cruzjs/start'] = '^0.1.11';
  deps['@cruzjs/saas'] = '^0.1.11';

  const pkg = {
    name: options.projectName,
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      dev: 'cruz dev',
      build: 'cruz build',
      typecheck: 'cruz typecheck',
      'db:generate': 'cruz db generate',
      'db:migrate': 'cruz db migrate',
      'db:migrate:remote': 'cruz db migrate --remote',
      'db:studio': 'cruz db studio',
      'db:seed': 'cruz db seed',
      deploy: 'cruz deploy production',
    },
    dependencies: deps,
    devDependencies: {
      '@babel/core': '^7.26.0',
      '@babel/plugin-proposal-decorators': '^7.25.9',
      '@babel/plugin-syntax-typescript': '^7.25.9',
      '@babel/plugin-transform-class-properties': '^7.25.9',
      '@cruzjs/cli': '^0.1.4',
      '@cloudflare/workers-types': '^4.20260124.0',
      '@react-router/dev': '^7.11.0',
      '@tailwindcss/postcss': '^4.1.17',
      '@tailwindcss/vite': '^4.2.1',
      '@types/node': '^20.0.0',
      '@types/react': '^18.0.27',
      '@types/react-dom': '^18.0.10',
      '@vitejs/plugin-react': '^4.7.0',
      'autoprefixer': '^10.4.21',
      'babel-plugin-transform-typescript-metadata': '^0.3.2',
      'drizzle-kit': '^0.31.8',
      'postcss': '^8.5.6',
      'tailwindcss': '^4.1.17',
      'typescript': '^5.9.3',
      'vite-plus': 'latest',
      'vite-plugin-babel': '^1.5.1',
      'wrangler': '^3.99.0',
    },
  };

  return JSON.stringify(pkg, null, 2);
}

function generateAppServer(options: Options): string {
  const lines: string[] = [
    `/**`,
    ` * App Server`,
    ` *`,
    ` * Configures database schema and defines application modules.`,
    ` * Imported by entry.server.tsx before any request handling.`,
    ` */`,
    `import 'reflect-metadata';`,
  ];

  return lines.join('\n') + '\n';
}

function generateSchema(options: Options): string {
  const lines = [
    `/**`,
    ` * Application Database Schema`,
    ` */`,
    ``,
  ];

  if (options.withStart) {
    lines.push(`// Re-export all tables from @cruzjs/start (includes core and pro)`);
    lines.push(`export * from '@cruzjs/start/database/schema';`);
  } else {
    lines.push(`// Re-export core tables`);
    lines.push(`export * from '@cruzjs/core/database/schema';`);
    if (options.withPro) {
      lines.push(`export * from '@cruzjs/saas/database/schema';`);
    }
  }

  lines.push('');
  lines.push('// Add your app-specific tables below');
  lines.push('');

  return lines.join('\n');
}

function generateCruzConfig(options: Options): string {
  const bindings: Record<string, boolean> = {
    d1: true,
    kv: true,
  };

  return `import { defineConfig } from '@cruzjs/cli/config';

export default defineConfig({
  name: '${options.projectName}',
  compatibilityDate: '2024-12-01',
  compatibilityFlags: ['nodejs_compat'],

  bindings: ${JSON.stringify(bindings, null, 4).replace(/\n/g, '\n  ')},

  email: {
    provider: 'mailchannels',
  },

  environments: {
    production: {
      vars: {
        NODE_ENV: 'production',
        APP_URL: 'https://${options.projectName}.pages.dev',
      },
    },
  },
});
`;
}

function generateWranglerToml(options: Options): string {
  const name = options.projectName;
  return `name = "${name}"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist/client"

[[d1_databases]]
binding = "DB"
database_name = "${name}-db"
database_id = ""
`;
}

function generateWranglerDevToml(options: Options): string {
  const name = options.projectName;
  return `name = "${name}-dev"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist/client"

[[d1_databases]]
binding = "DB"
database_name = "${name}-dev-db"
database_id = "local"

[[kv_namespaces]]
binding = "KV"
id = "local"
`;
}

function generateDrizzleConfig(): string {
  return `import type { Config } from 'drizzle-kit';

export default {
  schema: './src/database/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
} satisfies Config;
`;
}

function generateEnvExample(options: Options): string {
  const base = `# Application
APP_URL=http://localhost:5000

# Security — generate with: openssl rand -base64 32
SESSION_SECRET=change-me-to-a-random-32-char-secret
CSRF_SECRET=change-me-to-a-random-32-char-secret
JWT_SECRET=change-me-to-a-random-32-char-secret
JWT_REFRESH_SECRET=change-me-to-a-random-32-char-secret

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Email (optional — defaults to console in dev)
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@example.com
EMAIL_FROM_NAME=My App
`;

  const saasVars = `
# Stripe — required for billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
`;

  return options.saas ? base + saasVars : base + `
# Stripe (optional — required for @cruzjs/saas billing)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
`;
}

async function main(): Promise<void> {
  const options = await parseArgs(process.argv.slice(2));
  const targetDir = path.resolve(process.cwd(), options.projectName);

  if (fs.existsSync(targetDir)) {
    console.error(`Directory "${options.projectName}" already exists.`);
    process.exit(1);
  }

  console.log(`\nCreating CruzJS app: ${options.projectName}`);
  console.log(`  Template: ${options.saas ? 'SaaS (billing + orgs)' : 'Framework app'}\n`);

  // Create directory
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy base template files
  const templateDir = path.resolve(__dirname, '../templates/default');
  if (fs.existsSync(templateDir)) {
    copyTemplate(templateDir, targetDir);
  }

  // Overlay saas template on top of the base template
  if (options.saas) {
    const saasTemplateDir = path.resolve(__dirname, '../templates/saas');
    if (fs.existsSync(saasTemplateDir)) {
      copyTemplate(saasTemplateDir, targetDir);
    }
  }

  // Generate dynamic files
  fs.mkdirSync(path.join(targetDir, 'src/database'), { recursive: true });

  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    generatePackageJson(options),
  );

  fs.writeFileSync(
    path.join(targetDir, 'src/app.server.ts'),
    generateAppServer(options),
  );

  fs.writeFileSync(
    path.join(targetDir, 'src/database/schema.ts'),
    generateSchema(options),
  );

  fs.writeFileSync(
    path.join(targetDir, 'cruz.config.ts'),
    generateCruzConfig(options),
  );

  fs.writeFileSync(
    path.join(targetDir, 'drizzle.config.ts'),
    generateDrizzleConfig(),
  );

  // Override template wrangler files with project-name-specific ones
  fs.writeFileSync(
    path.join(targetDir, 'wrangler.toml'),
    generateWranglerToml(options),
  );

  fs.writeFileSync(
    path.join(targetDir, 'wrangler.dev.toml'),
    generateWranglerDevToml(options),
  );

  fs.writeFileSync(
    path.join(targetDir, '.env.example'),
    generateEnvExample(options),
  );

  // SaaS-specific post-scaffold setup
  if (options.saas && !options.skipInstall && process.stdin.isTTY) {
    await setupSaas(targetDir, options.projectName);
  }

  console.log(`Done! Created ${options.projectName}/`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${options.projectName}`);
  console.log(`  npm install`);
  console.log(`  cp .env.example .env`);
  if (options.saas) {
    console.log(`  # Add your Stripe keys to .env`);
  }
  console.log(`  cruz dev`);
  console.log('');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
