import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { DrizzleService, DrizzleCruzDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import type { AnyDialectDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import * as schema from '@/database/schema';

// Initialize an in-memory SQLite database for all unit tests
const testSqlite = new Database(':memory:');
testSqlite.pragma('journal_mode = WAL');
const testDb = drizzle(testSqlite, { schema });
DrizzleService.setSchema(schema);
DrizzleService.setDb(DrizzleCruzDatabase.create(testDb as AnyDialectDatabase));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock email templates to avoid React/JSX processing issues in tests
vi.mock('@cruzjs/core/email/template.service', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    emailTemplateService: {
      renderTemplate: vi.fn().mockResolvedValue({ html: '<html></html>', text: 'text' }),
      getSubject: vi.fn().mockReturnValue('Test Subject'),
    },
  };
});

// Mock React Email templates directory
vi.mock('@cruzjs/core/email/templates/*', () => ({}));

// Mock environment variables
vi.mock('@cruzjs/core/shared/config', () => ({
  getEnv: () => ({
    NODE_ENV: 'test',
    PORT: 3000,
    APP_URL: 'http://localhost:3000',
    DATABASE_URL: process.env.TEST_DATABASE_URL || 'file:./test.db',
    STORAGE_DRIVER: 'local',
    STORAGE_PATH: './test-storage',
    STORAGE_URL_BASE: 'http://localhost:3000/storage',
    EMAIL_PROVIDER: 'console',
    EMAIL_FROM: 'test@example.com',
    SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-at-least-32-characters-long',
    JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-at-least-32-characters-long',
    GOOGLE_CLIENT_ID: 'test',
    GOOGLE_CLIENT_SECRET: 'test',
    GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/auth/oauth/google/callback',
    METRICS_ENABLED: false,
  }),
  config: {
    auth: {
      emailVerificationTokenExpiryHours: 24,
      passwordResetTokenExpiryHours: 1,
      bcryptRounds: 10,
    },
    session: {
      ttlSeconds: 30 * 24 * 60 * 60, // 30 days
      refreshThresholdSeconds: 7 * 24 * 60 * 60, // 7 days
    },
    oauth: {
      google: {
        clientId: 'test-google-client-id',
        clientSecret: 'test-google-client-secret',
        redirectUri: 'http://localhost:3000/api/auth/oauth/google/callback',
      },
      facebook: undefined,
    },
    billing: {
      upgradeRules: {},
      defaultPlans: [],
    },
  },
}));
