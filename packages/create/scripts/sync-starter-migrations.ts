#!/usr/bin/env -S npx tsx
/**
 * Sync starter SQLite migrations from apps/demo into the create template.
 * Copies genesis migrations (0000–0002) and adds SocialAccount (0003).
 * Demo-specific migrations (chatbots, pdfs) are excluded.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const demoMigrations = path.join(repoRoot, 'apps/demo/src/database/migrations/sqlite');
const templateMigrations = path.join(__dirname, '../templates/default/src/database/migrations/sqlite');

const BASE_MIGRATIONS = [
  '0000_wide_genesis.sql',
  '0001_odd_silver_samurai.sql',
  '0002_add_deletion_requested_at.sql',
];

const SOCIAL_ACCOUNT = '0003_add_social_account.sql';
const SOCIAL_ACCOUNT_SRC = path.join(demoMigrations, '0005_add_social_account.sql');

fs.mkdirSync(path.join(templateMigrations, 'meta'), { recursive: true });

for (const file of BASE_MIGRATIONS) {
  fs.copyFileSync(path.join(demoMigrations, file), path.join(templateMigrations, file));
}

fs.copyFileSync(SOCIAL_ACCOUNT_SRC, path.join(templateMigrations, SOCIAL_ACCOUNT));

const journal = {
  version: '7',
  dialect: 'sqlite',
  entries: [
    { idx: 0, version: '6', when: 1773084898518, tag: '0000_wide_genesis', breakpoints: true },
    { idx: 1, version: '6', when: 1773249597560, tag: '0001_odd_silver_samurai', breakpoints: true },
    { idx: 2, version: '6', when: 1748188920000, tag: '0002_add_deletion_requested_at', breakpoints: true },
    { idx: 3, version: '6', when: 1748188921000, tag: '0003_add_social_account', breakpoints: true },
  ],
};

fs.writeFileSync(
  path.join(templateMigrations, 'meta/_journal.json'),
  `${JSON.stringify(journal, null, 2)}\n`,
);

console.log('Synced starter migrations to packages/create/templates/default/');
