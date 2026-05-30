// Route registration (safe to import in routes.ts — no DI/decorator imports)
export { registerCruzCoreRoutes } from './core-routes';
export { createRouteHelpers } from './helpers';
export { createCruzRoutes } from './create-routes';
export type { RouteHelpers, RouteOverride, RouteOverrides, RegisterRoutesOptions, RouteRegistrar, RouteFactory } from './types';
export type { CreateCruzRoutesOptions } from './create-routes';
export { applyRouteOverrides } from './utils';

// Route middleware (loader/action with DI container)
export {
  handleCruzLoader,
  handleCruzAction,
  withLoaderMiddleware,
  withActionMiddleware,
  MiddlewareProcessor,
  ConsoleLoggerMiddleware,
} from './middleware';
export type {
  LoaderFunctionArgsWithContainer,
  ActionFunctionArgsWithContainer,
  MiddlewareOptions,
  CruzContainer,
} from './middleware';
