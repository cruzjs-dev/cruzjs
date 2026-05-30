/**
 * REST API Router Types
 *
 * Type definitions for the class-based REST API router system.
 */

export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const;
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

export interface ApiRouterMetadata {
  prefix: string;
  version?: string;
}

export interface ApiRouteMetadata {
  method: HttpMethod;
  path: string;
  statusCode?: HttpStatus;
  description?: string;
}

export interface ApiParamMetadata {
  type: 'body' | 'param' | 'query' | 'headers' | 'req' | 'res' | 'session' | 'ip';
  key?: string;
  index: number;
}

export interface ApiRouteEntry {
  method: HttpMethod;
  pattern: URLPattern;
  rawPath: string;
  controllerClass: new (...args: any[]) => any;
  methodKey: string;
  params: ApiParamMetadata[];
  statusCode: HttpStatus;
}

export interface ApiContext {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  session: any | null;
  ip: string | null;
}
