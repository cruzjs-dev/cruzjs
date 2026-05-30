/**
 * API Versioning tRPC Middleware
 *
 * Creates a tRPC middleware that resolves the API version from the request,
 * adds it to the context, and generates deprecation/sunset response headers.
 */

import { TRPCError } from '@trpc/server';
import { VersioningService } from './versioning.service';
import type { ApiVersion, VersionConfig } from './versioning.types';

/**
 * Create a tRPC middleware that resolves API version from the request.
 *
 * 1. Resolves the version from the request (header, URL path, or query param)
 * 2. Adds the resolved version to the tRPC context as `ctx.apiVersion`
 * 3. Adds deprecation/sunset headers information to context for response handling
 *
 * @param config - Optional partial version config to override defaults
 *
 * @example
 * ```typescript
 * const versioned = versionMiddleware({ strategy: 'header' });
 *
 * export const myProcedure = publicProcedure
 *   .use(versioned)
 *   .query(async ({ ctx }) => {
 *     console.log(ctx.apiVersion); // 'v1'
 *   });
 * ```
 */
export function versionMiddleware(config?: Partial<VersionConfig>) {
  const service = new VersioningService(config);

  return async function apiVersion(opts: { ctx: any; next: Function }) {
    const request = opts.ctx.request as Request | undefined;

    let version: ApiVersion;
    try {
      version = request
        ? service.resolveVersion(request)
        : (service.getConfig().defaultVersion ?? service.getConfig().current);
    } catch (err) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: err instanceof Error ? err.message : 'Invalid API version',
      });
    }

    const responseHeaders = service.getResponseHeaders(version);

    return opts.next({
      ctx: {
        ...opts.ctx,
        apiVersion: version,
        apiVersionHeaders: responseHeaders,
        apiVersionDeprecated: service.isDeprecated(version),
      },
    });
  };
}

/**
 * Create a tRPC middleware that requires a specific API version.
 * Rejects requests that do not match the specified version.
 *
 * @param version - The required API version
 * @param config - Optional partial version config
 *
 * @example
 * ```typescript
 * const v2Only = versionedProcedure('v2');
 *
 * export const myProcedure = publicProcedure
 *   .use(v2Only)
 *   .query(async ({ ctx }) => { ... });
 * ```
 */
export function versionedProcedure(version: ApiVersion, config?: Partial<VersionConfig>) {
  const service = new VersioningService(config);

  return async function requireVersion(opts: { ctx: any; next: Function }) {
    const request = opts.ctx.request as Request | undefined;

    let resolvedVersion: ApiVersion;
    try {
      resolvedVersion = request
        ? service.resolveVersion(request)
        : (service.getConfig().defaultVersion ?? service.getConfig().current);
    } catch (err) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: err instanceof Error ? err.message : 'Invalid API version',
      });
    }

    if (resolvedVersion !== version) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `This endpoint requires API version "${version}", but "${resolvedVersion}" was requested.`,
      });
    }

    const responseHeaders = service.getResponseHeaders(resolvedVersion);

    return opts.next({
      ctx: {
        ...opts.ctx,
        apiVersion: resolvedVersion,
        apiVersionHeaders: responseHeaders,
        apiVersionDeprecated: service.isDeprecated(resolvedVersion),
      },
    });
  };
}

/**
 * Extract API version headers from context for setting on the HTTP response.
 */
export function versionHeaders(ctx: { apiVersionHeaders?: Record<string, string> }): Record<string, string> {
  return ctx.apiVersionHeaders ?? {};
}
