import { type RouteConfig, route, index, layout, prefix } from '@react-router/dev/routes';
import { createCruzRoutes } from '@cruzjs/core/routing';
import { registerCruzStartRoutes } from '@cruzjs/start/routing';

export default createCruzRoutes({
  route, index, layout, prefix,
  dir: import.meta.dirname,
  framework: {
    registrars: [registerCruzStartRoutes],
  },
  routes: [
    index('routes/index.tsx'),
  ],
}) satisfies RouteConfig;
