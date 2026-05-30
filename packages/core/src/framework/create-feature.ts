/**
 * createFeature — Middle ground between createCrud (fully generated) and manual.
 *
 * Returns base classes that can be extended with custom logic:
 *   - `BaseService` — extends `BaseCrudService` with scope pre-configured
 *   - `BaseRouter`  — extends `TrpcRouter` with 5 CRUD procedures wired to the service
 *
 * Unlike `createCrud`, this does NOT register DI tokens automatically.
 * The consumer is expected to extend the returned classes, decorate them
 * with `@Injectable()` / `@Router()`, and register them in a `@Module()`.
 *
 * @example
 * ```typescript
 * const { BaseService, BaseRouter } = createFeature({
 *   name: 'Tasks',
 *   table: tasks,
 *   scope: 'org',
 *   schemas: {
 *     create: createTaskSchema,
 *     update: updateTaskSchema,
 *   },
 * });
 *
 * @Injectable()
 * export class TasksService extends BaseService {
 *   async getOverdue(orgId: string) {
 *     return this.db.select().from(this.table)
 *       .where(and(eq(tasks.orgId, orgId), lt(tasks.dueDate, new Date())));
 *   }
 * }
 *
 * @Router()
 * export class TasksTrpc extends BaseRouter {
 *   @Route() getOverdue = orgProcedure.query(async ({ ctx }) => {
 *     const svc = this.getService(ctx);
 *     return (svc as TasksService).getOverdue(ctx.org.orgId);
 *   });
 * }
 * ```
 */

import 'reflect-metadata';
import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
import type { Table, TableConfig } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

import { BaseCrudService, type BaseCrudServiceConfig } from '../crud/base-crud.service';
import type { CrudScope } from '../crud/crud.types';
import { TrpcRouter, Route } from '../trpc/router-class';
import { orgProcedure, protectedProcedure } from '../trpc/context';
import { paginatedMiddleware } from '../pagination/pagination.middleware';
import type { CruzDatabase } from '../shared/database/drizzle.service';
import { DRIZZLE } from '../shared/database/drizzle.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateFeatureOptions<TTable extends Table<TableConfig>> {
  /** Resource name (PascalCase), used for class naming and DI token convention. */
  name: string;
  /** Drizzle table definition. */
  table: TTable;
  /** Access scope — controls procedure type and scope filtering. */
  scope: CrudScope;
  /** Zod schemas for create and update validation. */
  schemas: {
    create: ZodTypeAny;
    update: ZodTypeAny;
  };
  /** Override the FK column name used for scope filtering. */
  scopeColumn?: string;
  /** Primary key column name. Default: `'id'`. */
  idColumn?: string;
  /** Whether the table uses soft deletes. Auto-detected from `deletedAt` column if not set. */
  softDelete?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScopeId(scope: CrudScope, ctx: Record<string, unknown>): string | null {
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

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates extensible base classes for a feature domain.
 *
 * The returned `BaseService` is a pre-configured `BaseCrudService` subclass.
 * The returned `BaseRouter` is a `TrpcRouter` subclass with 5 CRUD procedures.
 *
 * Both are designed to be extended — add custom methods to the service,
 * add custom routes to the router. No DI tokens are registered; use
 * `@Injectable()` and `@Router()` on your subclasses.
 */
export function createFeature<TTable extends Table<TableConfig>>(
  options: CreateFeatureOptions<TTable>,
) {
  const {
    name,
    table,
    scope,
    schemas,
    scopeColumn: explicitScopeColumn,
    idColumn,
    softDelete,
  } = options;

  const scopeColumn =
    explicitScopeColumn ??
    (scope === 'org' ? 'orgId' : scope === 'user' ? 'userId' : undefined);

  const serviceConfig: BaseCrudServiceConfig = {
    scope,
    scopeColumn,
    softDelete,
    idColumn,
  };

  // ── Base Service ──────────────────────────────────────────────────────────

  /**
   * Pre-configured BaseCrudService for the given table and scope.
   * Extend this class and decorate with `@Injectable()`.
   *
   * The constructor expects a `CruzDatabase` instance (inject with `@Inject(DRIZZLE)`).
   */
  class FeatureBaseService extends BaseCrudService<TTable> {
    constructor(db: CruzDatabase) {
      super(db, table, serviceConfig);
    }
  }

  Object.defineProperty(FeatureBaseService, 'name', { value: `${name}BaseService` });

  // ── Base Router ───────────────────────────────────────────────────────────

  const baseProcedure = scope === 'org' ? orgProcedure : protectedProcedure;

  const ServiceToken = Symbol.for(`${name}Service`);

  /**
   * Pre-configured TrpcRouter with standard CRUD procedures.
   * Extend this class and decorate with `@Router()`.
   *
   * Override any procedure by redefining the property with `@Route()`.
   * Add new procedures the same way.
   *
   * Use `this.getService(ctx)` to resolve the service from the DI container.
   * The service token defaults to `Symbol.for('<Name>Service')`.
   */
  class FeatureBaseRouter extends TrpcRouter {
    /**
     * Resolve the service instance from the request-scoped DI container.
     * Override `serviceToken` in your subclass to use a different token.
     */
    protected get serviceToken(): symbol {
      return ServiceToken;
    }

    protected getService(ctx: Record<string, unknown>): FeatureBaseService {
      const container = ctx['container'] as { resolve: (token: unknown) => unknown };
      return container.resolve(this.serviceToken) as FeatureBaseService;
    }

    // ── list ────────────────────────────────────────────────────────────────
    @Route() list = baseProcedure
      .use(paginatedMiddleware)
      .input(
        z.object({
          page: z.coerce.number().int().min(1).default(1),
          perPage: z.coerce.number().int().min(1).max(100).default(25),
          orderBy: z.string().optional(),
          orderDir: z.enum(['asc', 'desc']).default('asc').optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const svc = this.getService(ctxRecord);
        const scopeId = getScopeId(scope, ctxRecord);
        const inp = input as Record<string, unknown>;

        const paginationCtx = ctxRecord['pagination'] as
          | { page: number; perPage: number }
          | undefined;
        const pagination = paginationCtx ?? {
          page: (inp['page'] as number) ?? 1,
          perPage: (inp['perPage'] as number) ?? 25,
        };

        const { items, total } = await svc.list(scopeId, {
          page: pagination.page,
          perPage: pagination.perPage,
          orderBy: inp['orderBy'] as string | undefined,
          orderDir: inp['orderDir'] as 'asc' | 'desc' | undefined,
        });

        return {
          data: items,
          meta: {
            type: 'offset' as const,
            page: pagination.page,
            perPage: pagination.perPage,
            total,
            totalPages: Math.ceil(total / pagination.perPage),
          },
        };
      });

    // ── get ─────────────────────────────────────────────────────────────────
    @Route() get = baseProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const svc = this.getService(ctxRecord);
        const scopeId = getScopeId(scope, ctxRecord);

        const item = await svc.getById(input.id, scopeId);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND' });

        return item;
      });

    // ── create ──────────────────────────────────────────────────────────────
    @Route() create = baseProcedure
      .input(schemas.create)
      .mutation(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const svc = this.getService(ctxRecord);
        const scopeId = getScopeId(scope, ctxRecord);

        const data: Record<string, unknown> = { ...(input as object) };
        if (scopeId && scopeColumn) data[scopeColumn] = scopeId;

        return svc.create(data as TTable['$inferInsert']);
      });

    // ── update ──────────────────────────────────────────────────────────────
    @Route() update = baseProcedure
      .input(z.object({ id: z.string(), data: schemas.update }))
      .mutation(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const svc = this.getService(ctxRecord);
        const scopeId = getScopeId(scope, ctxRecord);

        const existing = await svc.getById(input.id, scopeId);
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

        return svc.update(input.id, input.data as Partial<TTable['$inferInsert']>);
      });

    // ── delete ──────────────────────────────────────────────────────────────
    @Route() delete = baseProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const ctxRecord = ctx as Record<string, unknown>;
        const svc = this.getService(ctxRecord);
        const scopeId = getScopeId(scope, ctxRecord);

        const existing = await svc.getById(input.id, scopeId);
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

        await svc.delete(input.id);
        return { success: true as const };
      });
  }

  Object.defineProperty(FeatureBaseRouter, 'name', { value: `${name}BaseRouter` });

  return {
    /**
     * Pre-configured service base class. Extend and decorate with `@Injectable()`.
     * Inject the database with `@Inject(DRIZZLE) db: CruzDatabase` in your subclass constructor.
     */
    BaseService: FeatureBaseService as unknown as typeof FeatureBaseService & (new (db: CruzDatabase) => FeatureBaseService),
    /**
     * Pre-configured router base class with 5 CRUD procedures. Extend and decorate with `@Router()`.
     * Override procedures by redefining them with `@Route()`.
     */
    BaseRouter: FeatureBaseRouter as unknown as typeof FeatureBaseRouter & (new () => FeatureBaseRouter),
    /**
     * Default service DI token: `Symbol.for('<Name>Service')`.
     * Use this when registering your service subclass in the module.
     */
    ServiceToken,
    /**
     * The DRIZZLE injection token, re-exported for convenience.
     */
    DRIZZLE,
  };
}
