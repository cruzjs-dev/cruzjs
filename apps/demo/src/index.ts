/**
 * CruzJS Demo App
 *
 * A full-featured SaaS application built with CruzJS framework packages:
 * - @cruzjs/core — Auth, sessions, jobs, email, DI, database
 * - @cruzjs/saas — Organizations, billing, admin
 * - @cruzjs/start — User profiles, API keys, dashboard, notifications, integrations
 * - @cruzjs/ui — Shared UI components
 */

export { trpc, createTRPCClient, createQueryClient } from './trpc/client';
export type { AppRouter } from './trpc/router';
