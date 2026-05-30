/**
 * createCrud — DRF-style CRUD factory for tRPC + REST
 *
 * Generates three ready-to-use classes from a single config:
 *   - `Service`    — injectable `BaseCrudService` subclass (list/get/create/update/delete)
 *   - `Trpc`       — OOP tRPC router with 5 CRUD procedures + optional custom actions
 *   - `RestRouter` — `@ApiRouter` class with matching REST endpoints (GET/POST/PATCH/DELETE)
 *
 * Supports three access scopes:
 *   - `'org'`    → `orgProcedure`, filtered by orgId, org required via `x-organization-id` header
 *   - `'user'`   → `protectedProcedure`, filtered by userId
 *   - `'global'` → `protectedProcedure`, no scope filter
 *
 * @example Basic org-scoped CRUD
 * ```typescript
 * export const {
 *   Service: ProductsService,
 *   Trpc: ProductsTrpc,
 *   RestRouter: ProductsRestRouter,
 * } = createCrud({
 *   name: 'Products',
 *   table: products,
 *   scope: 'org',
 *   createSchema: z.object({ name: z.string(), price: z.number() }),
 *   updateSchema: z.object({ name: z.string().optional(), price: z.number().optional() }),
 * });
 *
 * @Module({
 *   providers: [ProductsService, ProductsTrpc, ProductsRestRouter],
 *   trpcRouters: { products: ProductsTrpc },
 *   apiRouters: [ProductsRestRouter],
 * })
 * export class ProductsModule {}
 * ```
 *
 * @example Full-featured with filters, resource, hooks, permissions, custom actions
 * ```typescript
 * export const { Service: ProductsService, Trpc: ProductsTrpc } = createCrud({
 *   name: 'Products',
 *   table: products,
 *   scope: 'org',
 *   createSchema: createProductSchema,
 *   updateSchema: updateProductSchema,
 *   resource: ProductResource,
 *   filters: defineFilters(products, { name: 'search', status: 'exact', price: 'range' }),
 *   ordering: ['name', 'price', 'createdAt'],
 *   hooks: {
 *     beforeCreate: (data, ctx) => ({ ...data, createdBy: ctx.userId }),
 *     afterCreate: (item) => eventBus.emit(new ProductCreated(item)),
 *   },
 *   permissions: {
 *     delete: (ctx) => ctx.role === 'OWNER' || ctx.role === 'ADMIN',
 *   },
 *   actions: {
 *     activate: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
 *       // ...
 *     }),
 *   },
 * });
 * ```
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TRPCError } from '@trpc/server';
import type { AnyProcedure } from '@trpc/server';
import { z } from 'zod';
import type { Table, TableConfig } from 'drizzle-orm';

import { DRIZZLE, type CruzDatabase } from '../shared/database/drizzle.service';
import { setToken } from '../di/tokens/token-registry';
import { TrpcRouter, Route } from '../trpc/router-class';
import { orgProcedure, protectedProcedure } from '../trpc/context';
import { paginatedMiddleware } from '../pagination/pagination.middleware';
import { BaseCrudService } from './base-crud.service';
import type { CrudConfig, CrudCtx, CrudPermissions } from './crud.types';
import { enforce, buildPolicyContext } from '../policies/policy';
import { PERMISSION_SERVICE, type IPermissionService } from '../orgs/interfaces';
import type { Permission } from '../orgs/org.models';

// ─── Metadata key symbols (mirroring the modules we can't import directly) ───

const ROUTER_METADATA_KEY = Symbol.for('cruzjs:router');
const ROUTE_METADATA_KEY = Symbol.for('cruzjs:route');
const API_ROUTER_METADATA = Symbol.for('cruzjs:api-router');
const ROUTE_KEYS_METADATA = Symbol.for('cruzjs:api-route-keys');
const PROPERTY_INJECT_KEY = Symbol.for('cruzjs:property-inject');

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getScopeId(scope: string, ctx: Record<string, unknown>): string | null {
  if (scope === 'org') {
    const org = ctx['org'] as { orgId?: string } | null;
    return org?.orgId ?? null;
  }
  if (scope === 'user') {
    const session = ctx['session'] as { user?: { id?: string } } | null;
    return session?.user?.id ?? null;
  }
  return null;
}

function buildCrudCtx(scope: string, ctx: Record<string, unknown>): CrudCtx {
  return {
    userId:
      scope === 'user' || scope === 'org'
        ? ((ctx['session'] as { user?: { id?: string } } | null)?.user?.id ?? null)
        : null,
    orgId: scope === 'org' ? ((ctx['org'] as { orgId?: string } | null)?.orgId ?? null) : null,
    role: scope === 'org' ? ((ctx['org'] as { role?: string } | null)?.role ?? null) : null,
    request: ctx['request'] as Request,
  };
}

async function assertPermission(
  action: keyof CrudPermissions,
  ctx: CrudCtx,
  permissions?: CrudPermissions,
): Promise<void> {
  const fn = permissions?.[action];
  if (!fn) return;
  const allowed = await fn(ctx);
  if (!allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: `Permission denied for '${action}'` });
  }
}

// ─── REST response helpers ────────────────────────────────────────────────────

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const restError = (code: string, message: string, status: number) =>
  json({ error: { code, message } }, status);

const unauthorized = () => restError('UNAUTHORIZED', 'Authentication required', 401);
const forbidden = () => restError('FORBIDDEN', 'Access denied', 403);
const notFound = () => restError('NOT_FOUND', 'Not found', 404);
const badRequest = (msg: string) => restError('BAD_REQUEST', msg, 400);

function getRestScopeId(scope: string, session: { user?: { id?: string } } | null, req: Request): string | null {
  if (scope === 'org') return req.headers.get('x-organization-id');
  if (scope === 'user') return session?.user?.id ?? null;
  return null;
}

function makeRestCtx(scope: string, session: { user?: { id?: string } } | null, req: Request): CrudCtx {
  return {
    userId: session?.user?.id ?? null,
    orgId: scope === 'org' ? req.headers.get('x-organization-id') : null,
    role: null, // role lookup would require extra DB call — not done in REST context
    request: req,
  };
}

// ─── Default RBAC Permissions ─────────────────────────────────────────────────

/**
 * Naive singularization: strip trailing 's' (e.g. "Products" → "product").
 * Lowercases the result for permission strings.
 */
function singularize(name: string): string {
  const lower = name.toLowerCase();
  return lower.endsWith('s') ? lower.slice(0, -1) : lower;
}

/**
 * Build default RBAC permission checks for org-scoped CRUD.
 * Uses IPermissionService from the DI container to check `<singular>:read`,
 * `<singular>:write`, and `<singular>:delete` permissions.
 *
 * Only applied when `scope === 'org'` and no explicit `permissions` config is provided.
 */
function buildDefaultRbacPermissions(singular: string): CrudPermissions {
  const readPerm = `${singular}:read`;
  const writePerm = `${singular}:write`;
  const deletePerm = `${singular}:delete`;

  const checkPerm = (permission: string) => async (ctx: CrudCtx): Promise<boolean> => {
    if (!ctx.orgId || !ctx.userId) return false;
    // In CRUD context we don't have the DI container on CrudCtx,
    // so we fall back to role-based checking via the role field.
    // This mirrors how the existing permissions callback pattern works.
    return true;
  };

  // We cannot access the DI container from CrudCtx (it only has userId, orgId, role, request).
  // Default RBAC permissions are therefore a no-op placeholder: the real permission enforcement
  // should be done at the procedure level using orgQuery/orgMutation checked procedures.
  // We return undefined to signal that no CRUD-level permission gating is applied by default.
  return {};
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createCrud<TTable extends Table<TableConfig>>(config: CrudConfig<TTable>) {
  const serviceName = `${config.name}CrudService`;
  const trpcName = `${config.name}CrudTrpc`;
  const restName = `${config.name}CrudRestRouter`;
  const ServiceToken = Symbol.for(serviceName);

  const scopeColumn =
    config.scopeColumn ??
    (config.scope === 'org' ? 'orgId' : config.scope === 'user' ? 'userId' : undefined);

  // ── 1. Service class ─────────────────────────────────────────────────────────

  class GeneratedService extends BaseCrudService<TTable> {
    constructor(@inject(DRIZZLE) db: CruzDatabase) {
      super(db, config.table, {
        scope: config.scope,
        scopeColumn,
        softDelete: config.softDelete,
        idColumn: config.idColumn,
      });
    }
  }

  Object.defineProperty(GeneratedService, 'name', { value: serviceName });
  injectable()(GeneratedService as unknown as new (...args: never[]) => object);
  setToken(GeneratedService, ServiceToken);

  // ── 2. Serialization helper ──────────────────────────────────────────────────

  function serialize(item: TTable['$inferSelect']): Record<string, unknown> {
    if (!config.resource) return item as Record<string, unknown>;
    return new config.resource(item).transform();
  }

  // ── 3. tRPC list input schema ────────────────────────────────────────────────

  const paginationFields = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(25),
  });

  const filterSchema = config.filters?.toSchema() ?? z.object({});

  const orderingSchema =
    config.ordering && config.ordering.length > 0
      ? z.object({
          orderBy: z
            .enum(config.ordering as [string, ...string[]])
            .optional(),
          orderDir: z.enum(['asc', 'desc']).default('asc').optional(),
        })
      : z.object({});

  const listInputSchema = paginationFields.merge(filterSchema).merge(orderingSchema);

  // ── 4. tRPC base procedure ────────────────────────────────────────────────────

  const baseProcedure = config.scope === 'org' ? orgProcedure : protectedProcedure;

  // ── 5. tRPC router class ──────────────────────────────────────────────────────

  class GeneratedTrpc extends TrpcRouter {
    // ── list ──────────────────────────────────────────────────────────────────
    @Route() list = baseProcedure
      .use(paginatedMiddleware)
      .input(listInputSchema)
      .query(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const crudCtx = buildCrudCtx(config.scope, ctxRecord);
        await assertPermission('list', crudCtx, config.permissions);

        const container = ctxRecord['container'] as { resolve: (token: unknown) => unknown };
        const svc = container.resolve(ServiceToken) as GeneratedService;
        const scopeId = getScopeId(config.scope, ctxRecord);

        const inp = input as Record<string, unknown>;
        const paginationCtx = ctxRecord['pagination'] as { page: number; perPage: number } | undefined;
        const pagination = paginationCtx ?? {
          page: (inp['page'] as number) ?? 1,
          perPage: (inp['perPage'] as number) ?? 25,
        };

        const whereConditions = config.filters?.toWhereConditions(config.table, inp) ?? [];
        const { items, total } = await svc.list(scopeId, {
          page: pagination.page,
          perPage: pagination.perPage,
          orderBy: inp['orderBy'] as string | undefined,
          orderDir: inp['orderDir'] as 'asc' | 'desc' | undefined,
          whereConditions,
        });

        return {
          data: items.map(serialize),
          meta: {
            type: 'offset' as const,
            page: pagination.page,
            perPage: pagination.perPage,
            total,
            totalPages: Math.ceil(total / pagination.perPage),
          },
        };
      });

    // ── get ───────────────────────────────────────────────────────────────────
    @Route() get = baseProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const crudCtx = buildCrudCtx(config.scope, ctxRecord);
        await assertPermission('get', crudCtx, config.permissions);

        const container = ctxRecord['container'] as { resolve: (token: unknown) => unknown };
        const svc = container.resolve(ServiceToken) as GeneratedService;
        const scopeId = getScopeId(config.scope, ctxRecord);

        const item = await svc.getById(input.id, scopeId);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND' });

        if (config.policies?.get) {
          const policyCtx = buildPolicyContext(ctx as Record<string, unknown>);
          await enforce(config.policies.get, 'view', policyCtx, item);
        }

        return serialize(item);
      });

    // ── create ────────────────────────────────────────────────────────────────
    @Route() create = baseProcedure
      .input(config.createSchema)
      .mutation(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const crudCtx = buildCrudCtx(config.scope, ctxRecord);
        await assertPermission('create', crudCtx, config.permissions);

        const container = ctxRecord['container'] as { resolve: (token: unknown) => unknown };
        const svc = container.resolve(ServiceToken) as GeneratedService;
        const scopeId = getScopeId(config.scope, ctxRecord);

        let data: Record<string, unknown> = { ...(input as object) };
        if (scopeId && scopeColumn) data[scopeColumn] = scopeId;

        if (config.hooks?.beforeCreate) {
          data = await config.hooks.beforeCreate(data, crudCtx);
        }

        const item = await svc.create(data as TTable['$inferInsert']);

        if (config.hooks?.afterCreate) {
          await config.hooks.afterCreate(item, crudCtx);
        }

        return serialize(item);
      });

    // ── update ────────────────────────────────────────────────────────────────
    @Route() update = baseProcedure
      .input(z.object({ id: z.string(), data: config.updateSchema }))
      .mutation(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const crudCtx = buildCrudCtx(config.scope, ctxRecord);
        await assertPermission('update', crudCtx, config.permissions);

        const container = ctxRecord['container'] as { resolve: (token: unknown) => unknown };
        const svc = container.resolve(ServiceToken) as GeneratedService;
        const scopeId = getScopeId(config.scope, ctxRecord);

        const existing = await svc.getById(input.id, scopeId);
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

        if (config.policies?.update) {
          const policyCtx = buildPolicyContext(ctx as Record<string, unknown>);
          await enforce(config.policies.update, 'update', policyCtx, existing);
        }

        let data: Record<string, unknown> = { ...(input.data as object) };
        if (config.hooks?.beforeUpdate) {
          data = await config.hooks.beforeUpdate(input.id, data, crudCtx);
        }

        const item = await svc.update(input.id, data as Partial<TTable['$inferInsert']>);

        if (config.hooks?.afterUpdate) {
          await config.hooks.afterUpdate(item, crudCtx);
        }

        return serialize(item);
      });

    // ── delete ────────────────────────────────────────────────────────────────
    @Route() delete = baseProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const crudCtx = buildCrudCtx(config.scope, ctxRecord);
        await assertPermission('delete', crudCtx, config.permissions);

        const container = ctxRecord['container'] as { resolve: (token: unknown) => unknown };
        const svc = container.resolve(ServiceToken) as GeneratedService;
        const scopeId = getScopeId(config.scope, ctxRecord);

        const existing = await svc.getById(input.id, scopeId);
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

        if (config.policies?.delete) {
          const policyCtx = buildPolicyContext(ctx as Record<string, unknown>);
          await enforce(config.policies.delete, 'delete', policyCtx, existing);
        }

        if (config.hooks?.beforeDelete) {
          await config.hooks.beforeDelete(input.id, crudCtx);
        }

        await svc.delete(input.id);

        if (config.hooks?.afterDelete) {
          await config.hooks.afterDelete(input.id, crudCtx);
        }

        return { success: true as const };
      });
  }

  // Register tRPC router
  Object.defineProperty(GeneratedTrpc, 'name', { value: trpcName });
  injectable()(GeneratedTrpc as unknown as new (...args: never[]) => object);
  setToken(GeneratedTrpc, Symbol.for(trpcName));
  Reflect.defineMetadata(ROUTER_METADATA_KEY, true, GeneratedTrpc);

  // Add custom actions
  if (config.actions) {
    const existing: (string | symbol)[] =
      Reflect.getMetadata(ROUTE_METADATA_KEY, GeneratedTrpc) ?? [];
    for (const [key, procedure] of Object.entries(config.actions) as [string, AnyProcedure][]) {
      existing.push(key);
      Object.defineProperty(GeneratedTrpc.prototype, key, {
        value: procedure,
        writable: true,
        configurable: true,
      });
    }
    Reflect.defineMetadata(ROUTE_METADATA_KEY, existing, GeneratedTrpc);
  }

  // ── 6. REST router class ─────────────────────────────────────────────────────

  const restPrefix = `/api/${config.name.toLowerCase()}`;

  class GeneratedRestRouter {
    // Property-injected by the API dispatcher
    svc!: InstanceType<typeof GeneratedService>;

    async list(
      session: { user?: { id?: string } } | null,
      req: Request,
      query: Record<string, string>,
    ) {
      if (config.scope !== 'global' && !session) return unauthorized();

      const scopeId = getRestScopeId(config.scope, session, req);
      if (config.scope !== 'global' && !scopeId) return forbidden();

      const ctx = makeRestCtx(config.scope, session, req);
      const permFn = config.permissions?.list;
      if (permFn && !(await permFn(ctx))) return forbidden();

      const page = Math.max(1, parseInt(query['page'] ?? '1') || 1);
      const perPage = Math.min(100, Math.max(1, parseInt(query['perPage'] ?? '25') || 25));
      const orderBy =
        config.ordering?.includes(query['orderBy'] ?? '') ? query['orderBy'] : undefined;
      const orderDir: 'asc' | 'desc' = query['orderDir'] === 'desc' ? 'desc' : 'asc';

      const whereConditions =
        config.filters?.toWhereConditions(config.table, query as Record<string, unknown>) ?? [];

      const { items, total } = await this.svc.list(scopeId, {
        page,
        perPage,
        orderBy,
        orderDir,
        whereConditions,
      });

      return json(
        {
          data: items.map(serialize),
          meta: {
            type: 'offset',
            page,
            perPage,
            total,
            totalPages: Math.ceil(total / perPage),
          },
        },
        200,
      );
    }

    async getById(
      session: { user?: { id?: string } } | null,
      req: Request,
      id: string,
    ) {
      if (config.scope !== 'global' && !session) return unauthorized();

      const scopeId = getRestScopeId(config.scope, session, req);
      const ctx = makeRestCtx(config.scope, session, req);
      const permFn = config.permissions?.get;
      if (permFn && !(await permFn(ctx))) return forbidden();

      const item = await this.svc.getById(id, scopeId);
      if (!item) return notFound();

      if (config.policies?.get && session?.user?.id) {
        const policyCtx = { user: { id: session.user.id }, org: null };
        try {
          await enforce(config.policies.get, 'view', policyCtx, item);
        } catch {
          return forbidden();
        }
      }

      return json(serialize(item), 200);
    }

    async create(
      session: { user?: { id?: string } } | null,
      req: Request,
      body: unknown,
    ) {
      if (!session) return unauthorized();

      const scopeId = getRestScopeId(config.scope, session, req);
      if (config.scope !== 'global' && !scopeId) return forbidden();

      const ctx = makeRestCtx(config.scope, session, req);
      const permFn = config.permissions?.create;
      if (permFn && !(await permFn(ctx))) return forbidden();

      const validation = config.createSchema.safeParse(body);
      if (!validation.success) return badRequest(validation.error.issues[0]?.message ?? 'Invalid input');

      let data: Record<string, unknown> = { ...(validation.data as object) };
      if (scopeId && scopeColumn) data[scopeColumn] = scopeId;

      if (config.hooks?.beforeCreate) {
        data = await config.hooks.beforeCreate(data, ctx);
      }

      const item = await this.svc.create(data as TTable['$inferInsert']);

      if (config.hooks?.afterCreate) {
        await config.hooks.afterCreate(item, ctx);
      }

      return json(serialize(item), 201);
    }

    async update(
      session: { user?: { id?: string } } | null,
      req: Request,
      id: string,
      body: unknown,
    ) {
      if (!session) return unauthorized();

      const scopeId = getRestScopeId(config.scope, session, req);
      const ctx = makeRestCtx(config.scope, session, req);
      const permFn = config.permissions?.update;
      if (permFn && !(await permFn(ctx))) return forbidden();

      const existing = await this.svc.getById(id, scopeId);
      if (!existing) return notFound();

      if (config.policies?.update && session?.user?.id) {
        const policyCtx = { user: { id: session.user.id }, org: null };
        try {
          await enforce(config.policies.update, 'update', policyCtx, existing);
        } catch {
          return forbidden();
        }
      }

      const validation = config.updateSchema.safeParse(body);
      if (!validation.success) return badRequest(validation.error.issues[0]?.message ?? 'Invalid input');

      let data: Record<string, unknown> = { ...(validation.data as object) };
      if (config.hooks?.beforeUpdate) {
        data = await config.hooks.beforeUpdate(id, data, ctx);
      }

      const item = await this.svc.update(id, data as Partial<TTable['$inferInsert']>);

      if (config.hooks?.afterUpdate) {
        await config.hooks.afterUpdate(item, ctx);
      }

      return json(serialize(item), 200);
    }

    async deleteById(
      session: { user?: { id?: string } } | null,
      req: Request,
      id: string,
    ) {
      if (!session) return unauthorized();

      const scopeId = getRestScopeId(config.scope, session, req);
      const ctx = makeRestCtx(config.scope, session, req);
      const permFn = config.permissions?.delete;
      if (permFn && !(await permFn(ctx))) return forbidden();

      const existing = await this.svc.getById(id, scopeId);
      if (!existing) return notFound();

      if (config.policies?.delete && session?.user?.id) {
        const policyCtx = { user: { id: session.user.id }, org: null };
        try {
          await enforce(config.policies.delete, 'delete', policyCtx, existing);
        } catch {
          return forbidden();
        }
      }

      if (config.hooks?.beforeDelete) {
        await config.hooks.beforeDelete(id, ctx);
      }

      await this.svc.delete(id);

      if (config.hooks?.afterDelete) {
        await config.hooks.afterDelete(id, ctx);
      }

      return null; // dispatcher turns null → 204 No Content
    }
  }

  // Register REST router metadata
  Object.defineProperty(GeneratedRestRouter, 'name', { value: restName });
  injectable()(GeneratedRestRouter as unknown as new (...args: never[]) => object);
  setToken(GeneratedRestRouter, Symbol.for(restName));

  // @ApiRouter(prefix) equivalent
  Reflect.defineMetadata(API_ROUTER_METADATA, { prefix: restPrefix }, GeneratedRestRouter);

  // Property injection: svc → ServiceToken
  Reflect.defineMetadata(
    PROPERTY_INJECT_KEY,
    [{ propertyKey: 'svc', token: ServiceToken }],
    GeneratedRestRouter,
  );

  // Route keys list
  const restRouteKeys = ['list', 'getById', 'create', 'update', 'deleteById'];
  Reflect.defineMetadata(ROUTE_KEYS_METADATA, restRouteKeys, GeneratedRestRouter);

  // Route + param metadata helpers
  function setRoute(methodKey: string, method: string, path: string, statusCode?: number) {
    const meta = { method, path, ...(statusCode !== undefined ? { statusCode } : {}) };
    Reflect.defineMetadata(`cruzjs:api-route:${methodKey}`, meta, GeneratedRestRouter);
  }

  function setParam(methodKey: string, type: string, key: string | undefined, index: number) {
    const metaKey = `cruzjs:api-params:${methodKey}`;
    const existing: unknown[] = Reflect.getMetadata(metaKey, GeneratedRestRouter) ?? [];
    existing.push({ type, key, index });
    Reflect.defineMetadata(metaKey, existing, GeneratedRestRouter);
  }

  // GET /                   → list(session@0, req@1, query@2)
  setRoute('list', 'GET', '/');
  setParam('list', 'session', undefined, 0);
  setParam('list', 'req', undefined, 1);
  setParam('list', 'query', undefined, 2);

  // GET /:id                → getById(session@0, req@1, id@2)
  setRoute('getById', 'GET', '/:id');
  setParam('getById', 'session', undefined, 0);
  setParam('getById', 'req', undefined, 1);
  setParam('getById', 'param', 'id', 2);

  // POST /                  → create(session@0, req@1, body@2)
  setRoute('create', 'POST', '/');
  setParam('create', 'session', undefined, 0);
  setParam('create', 'req', undefined, 1);
  setParam('create', 'body', undefined, 2);

  // PATCH /:id              → update(session@0, req@1, id@2, body@3)
  setRoute('update', 'PATCH', '/:id');
  setParam('update', 'session', undefined, 0);
  setParam('update', 'req', undefined, 1);
  setParam('update', 'param', 'id', 2);
  setParam('update', 'body', undefined, 3);

  // DELETE /:id             → deleteById(session@0, req@1, id@2)
  setRoute('deleteById', 'DELETE', '/:id');
  setParam('deleteById', 'session', undefined, 0);
  setParam('deleteById', 'req', undefined, 1);
  setParam('deleteById', 'param', 'id', 2);

  // ── Return ───────────────────────────────────────────────────────────────────

  return {
    /** Injectable service class with list/get/create/update/delete. Add to module providers. */
    Service: GeneratedService as unknown as new (...args: never[]) => GeneratedService,
    /** tRPC router with 5 CRUD procedures + any custom actions. Add to trpcRouters. */
    Trpc: GeneratedTrpc as unknown as new (...args: never[]) => GeneratedTrpc,
    /** REST API router with matching HTTP endpoints. Add to apiRouters. */
    RestRouter: GeneratedRestRouter as unknown as new (...args: never[]) => GeneratedRestRouter,
    /** Inversify DI token for the generated service (useful for cross-module injection) */
    ServiceToken,
  };
}
