import { defineConfig } from '@cruzjs/cli/config';

export default defineConfig({
  name: 'cruzjs',
  compatibilityDate: '2024-12-01',
  compatibilityFlags: ['nodejs_compat'],

  bindings: {
    d1: true,
    kv: true,
    r2: false,
    ai: true,
    aiGateway: true,
    queues: true,
  },

  email: {
    provider: 'mailchannels',
  },

  // Additional queues beyond the built-in JOBS_QUEUE
  // queues: [
  //   { name: 'notifications', binding: 'NOTIFICATIONS_QUEUE' },
  // ],

  // Scheduled (cron) triggers
  scheduled: [
    { cron: '0 * * * *', description: 'Hourly cleanup (sessions, tokens, uploads)' },
  ],

  vars: {
    APP_NAME: 'CruzJS',
  },

  environments: {
    production: {
      vars: {
        NODE_ENV: 'production',
        APP_URL: 'https://cruzjs.pages.dev',
      },
    },
    staging: {
      vars: {
        NODE_ENV: 'staging',
        APP_URL: 'https://staging.cruzjs.pages.dev',
      },
    },
  },
});
