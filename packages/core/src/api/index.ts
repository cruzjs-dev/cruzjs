export { loader as healthLoader, action as healthAction } from './health';
export { loader as emailLogsLoader } from './email-logs';
export { loader as emailPreviewLoader } from './email-preview';
export { action as jobsCallbackAction } from './jobs-callback';

// REST API Routers
export { HttpMethod, HttpStatus } from './api.types';
export type {
  ApiRouterMetadata,
  ApiRouteMetadata,
  ApiParamMetadata,
  ApiRouteEntry,
  ApiContext,
} from './api.types';

/** @deprecated Use `ApiRouterMetadata` instead. */
export type { ApiRouterMetadata as ApiControllerMetadata } from './api.types';
/** @deprecated Use `ApiRouteEntry` instead. */
export type { ApiRouteEntry as ControllerRouteEntry } from './api.types';

export {
  ApiRouter,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Head,
  Options,
  HttpCode,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Session,
  Ip,
  getApiRouterMetadata,
  getControllerMetadata,
  getRouteMetadata,
  getParamMetadata,
  getApiRouterRouteKeys,
  getControllerRouteKeys,
  isApiRouter,
  isController,
} from './api.decorators';

export { ApiResponse } from './api-response';
export type { ApiErrorResponse, ApiSuccessResponse } from './api-response';

export { ApiRouterDispatcher, ControllerDispatcher } from './api-router.dispatcher';

export { ApiRouterBase } from './api-router.base';

export { handleApiRequest, getApiRouterDispatcher, getControllerDispatcher } from './api.handler';

export { createApiLoaderHandler, createApiActionHandler } from './api.catch-all';

export { ApiModule } from './api.module';
