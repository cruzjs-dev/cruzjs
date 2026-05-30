import { type RouteConfig, route, index, layout, prefix } from '@react-router/dev/routes';
import { createCruzRoutes } from '@cruzjs/core/routing';
import { registerCruzSaasRoutes } from '@cruzjs/saas/routing';
import { registerCruzStartRoutes } from '@cruzjs/start/routing';

export default createCruzRoutes({
  route, index, layout, prefix,
  dir: import.meta.dirname,
  framework: {
    registrars: [registerCruzSaasRoutes, registerCruzStartRoutes],
  },
  routes: [
    // Landing page (app-specific)
    index('routes/index.tsx'),

    // Feature demo page
    route('demo', 'routes/demo.tsx'),

    // Chatbots CRUD
    route('chatbots', 'routes/chatbots.tsx'),

    // PDF upload + AI analysis + chat
    route('pdfs', 'routes/pdfs.tsx'),

    // App-specific API routes
    ...prefix('api', [
      route('debug', 'routes/api/debug.ts'),
      route('jobs-example', 'routes/api/jobs-example.ts'),
    ]),

    // Admin panel
    ...prefix('admin', [
      index('routes/admin._index.tsx'),
      route('jobs', 'routes/admin.jobs.tsx'),
      route(':resource/new', 'routes/admin.$resource.new.tsx'),
      route(':resource/:id', 'routes/admin.$resource.$id.tsx'),
      route(':resource', 'routes/admin.$resource._index.tsx'),
    ]),

    // Dev tools (not available in production)
    ...prefix('dev', [
      route('emails', 'routes/dev.emails.tsx'),
      route('emails/:template', 'routes/dev.emails.$template.tsx'),
    ]),
  ],
}) satisfies RouteConfig;
