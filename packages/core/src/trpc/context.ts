import { initTRPC, TRPCError } from '@trpc/server';
import type { CruzContainer } from '../di';
import { getSession, type AuthenticatedRequest } from '../shared/middleware/session.middleware';
import { getOrgContext, type AuthenticatedOrgRequest } from '../shared/middleware/org-context.middleware';

/**
 * tRPC Context
 * Contains request, session, optional org context, and DI container.
 * `resHeaders` is mutable — mutations can append Set-Cookie, etc.
 */
export type Context = {
  request: Request;
  session: AuthenticatedRequest | null;
  org: AuthenticatedOrgRequest | null;
  container: CruzContainer;
  resHeaders: Headers;
};

/**
 * Create tRPC context from React Router request
 * @param request - The HTTP request
 * @param params - Route params
 * @param container - The DI container for this request
 * @param resHeaders - Mutable Headers passed back via responseMeta (Set-Cookie, etc.)
 */
export const createContext = async (
  request: Request,
  params: Record<string, string | undefined> | undefined,
  container: CruzContainer,
  resHeaders: Headers = new Headers(),
): Promise<Context> => {
  const session = await getSession(request, container);
  let org: AuthenticatedOrgRequest | null = null;

  if (session) {
    org = await getOrgContext(request, params, session, container);
  }

  return {
    request,
    session,
    org,
    container,
    resHeaders,
  };
};

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
        httpStatus: error.cause instanceof Response ? error.cause.status : 500,
        cause: isDev
          ? {
              message: error.cause instanceof Error ? error.cause.message : undefined,
              stack: error.cause instanceof Error
                ? error.cause.stack?.split('\n').slice(0, 5)
                : undefined,
            }
          : undefined,
      },
    };
  },
});

/**
 * Base router and procedure
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

/**
 * Org procedure - requires organization context
 */
export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.org) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Organization context required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      org: ctx.org,
    },
  });
});

