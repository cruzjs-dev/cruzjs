/**
 * CRUD Types
 *
 * Types for the DRF-style CRUD factory system.
 * Inspired by Django REST Framework's ModelViewSet pattern.
 */

import type { Table, TableConfig } from 'drizzle-orm';
import type { ZodTypeAny } from 'zod';
import type { AnyProcedure } from '@trpc/server';
import type { Resource } from '../resources/resource';
import type { FiltersConfig } from './filters';
import type { ResourcePolicy } from '../policies/policy';

export type { ZodTypeAny };

/**
 * Scope determines which tRPC procedure type is used and how queries are filtered.
 *
 * - `'org'`    → `orgProcedure`, queries filtered by `orgId`
 * - `'user'`   → `protectedProcedure`, queries filtered by `userId`
 * - `'global'` → `protectedProcedure`, no scope filter (admin/global tables)
 */
export type CrudScope = 'org' | 'user' | 'global';

/**
 * Contextual information available to hooks and permission functions.
 */
export interface CrudCtx {
  /** The authenticated user's id (null for global scope or unauthenticated) */
  userId: string | null;
  /** The current organization id (only set for org scope) */
  orgId: string | null;
  /** The user's role within the org (only set for org scope, null in REST context) */
  role: string | null;
  /** The raw incoming HTTP request */
  request: Request;
}

/**
 * Lifecycle hooks called around CRUD mutations.
 * Hooks receive a {@link CrudCtx} describing the authenticated actor.
 *
 * @example
 * ```typescript
 * hooks: {
 *   beforeCreate: (data, ctx) => ({ ...data, createdBy: ctx.userId }),
 *   afterCreate: async (item, ctx) => events.emit(new ProductCreated(item)),
 * }
 * ```
 */
export interface CrudHooks<TTable extends Table<TableConfig>> {
  /** Transform create input before inserting. Return the (possibly modified) data. */
  beforeCreate?: (
    data: Record<string, unknown>,
    ctx: CrudCtx,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;

  /** Called after a record is created. Use for side effects (events, audit logs). */
  afterCreate?: (item: TTable['$inferSelect'], ctx: CrudCtx) => Promise<void> | void;

  /** Transform update data before applying. Return the (possibly modified) data. */
  beforeUpdate?: (
    id: string,
    data: Record<string, unknown>,
    ctx: CrudCtx,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;

  /** Called after a record is updated. */
  afterUpdate?: (item: TTable['$inferSelect'], ctx: CrudCtx) => Promise<void> | void;

  /** Called before deleting a record. Throw to abort. */
  beforeDelete?: (id: string, ctx: CrudCtx) => Promise<void> | void;

  /** Called after a record is deleted. */
  afterDelete?: (id: string, ctx: CrudCtx) => Promise<void> | void;
}

/**
 * Per-action permission functions.
 * Return `false` (or resolve to `false`) to deny the action with a FORBIDDEN error.
 *
 * @example
 * ```typescript
 * permissions: {
 *   create: (ctx) => ctx.role !== 'VIEWER',
 *   delete: (ctx) => ctx.role === 'OWNER' || ctx.role === 'ADMIN',
 * }
 * ```
 */
export interface CrudPermissions {
  list?: (ctx: CrudCtx) => boolean | Promise<boolean>;
  get?: (ctx: CrudCtx) => boolean | Promise<boolean>;
  create?: (ctx: CrudCtx) => boolean | Promise<boolean>;
  update?: (ctx: CrudCtx) => boolean | Promise<boolean>;
  delete?: (ctx: CrudCtx) => boolean | Promise<boolean>;
}

/**
 * Per-record (object-level) policies for CRUD actions.
 * Each key maps a CRUD action to a ResourcePolicy that receives the fetched record.
 *
 * Unlike CrudPermissions (which check before fetching), policies check **after** the
 * record is loaded, enabling ownership/field-based authorization.
 */
export interface CrudPolicies<TTable extends Table<TableConfig>> {
  get?: ResourcePolicy<TTable['$inferSelect']>;
  update?: ResourcePolicy<TTable['$inferSelect']>;
  delete?: ResourcePolicy<TTable['$inferSelect']>;
}

/**
 * Configuration for `createCrud()`.
 *
 * @example Basic org-scoped CRUD
 * ```typescript
 * const { Service, Trpc, RestRouter } = createCrud({
 *   name: 'Products',
 *   table: products,
 *   scope: 'org',
 *   createSchema: z.object({ name: z.string(), price: z.number() }),
 *   updateSchema: z.object({ name: z.string().optional(), price: z.number().optional() }),
 * });
 * ```
 *
 * @example With filters, ordering, hooks, permissions, and a resource serializer
 * ```typescript
 * const { Service, Trpc, RestRouter } = createCrud({
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
 *     afterCreate: (item) => events.emit(new ProductCreated(item)),
 *   },
 *   permissions: {
 *     delete: (ctx) => ctx.role === 'OWNER' || ctx.role === 'ADMIN',
 *   },
 *   actions: {
 *     activate: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
 *       const svc = ctx.container.resolve(ProductsServiceToken);
 *       return svc.update(input.id, { status: 'active' });
 *     }),
 *   },
 * });
 * ```
 */
export interface CrudConfig<TTable extends Table<TableConfig>> {
  /**
   * Unique resource name used for DI token and REST prefix
   * (e.g. `'Products'` → token `ProductsCrudService`, REST prefix `/api/products`).
   */
  name: string;

  /** Drizzle table (standard or drizzle-universal). */
  table: TTable;

  /** Access scope — controls which tRPC procedure and scope FK are applied. */
  scope: CrudScope;

  /**
   * Column name for the scope foreign key.
   * Defaults: `'orgId'` for `'org'`, `'userId'` for `'user'`, unused for `'global'`.
   */
  scopeColumn?: string;

  /** Zod schema for create input. */
  createSchema: ZodTypeAny;

  /**
   * Zod schema for update input.
   * Typically the same as createSchema but with all fields optional.
   */
  updateSchema: ZodTypeAny;

  /**
   * Declarative field-level filters for the list endpoint.
   * @see {@link defineFilters}
   */
  filters?: FiltersConfig<TTable>;

  /**
   * Whitelist of column names allowed in `orderBy` on the list endpoint.
   * When set, the list input gains `orderBy` (enum) and `orderDir` ('asc'|'desc') fields.
   *
   * @example `ordering: ['name', 'price', 'createdAt']`
   */
  ordering?: (keyof TTable['$inferSelect'] & string)[];

  /**
   * Resource class for output serialization (like DRF serializers).
   * When provided, all CRUD outputs are passed through `new resource(item).transform()`.
   * Useful for hiding internal columns, renaming fields, and adding computed properties.
   *
   * @example
   * ```typescript
   * class ProductResource extends Resource<typeof products.$inferSelect> {
   *   transform() {
   *     return { id: this.model.id, name: this.model.name, formattedPrice: `$${this.model.price}` };
   *   }
   * }
   * ```
   */
  resource?: new (model: TTable['$inferSelect']) => Pick<Resource<TTable['$inferSelect']>, 'transform'>;

  /**
   * Lifecycle hooks called around mutations.
   * @see {@link CrudHooks}
   */
  hooks?: CrudHooks<TTable>;

  /**
   * Per-action permission functions. Return false to deny with FORBIDDEN.
   * These are context-level checks (role-based) — they run **before** the record is fetched.
   * @see {@link CrudPermissions}
   */
  permissions?: CrudPermissions;

  /**
   * Per-record (object-level) authorization policies.
   * These run **after** the record is fetched, giving access to the actual resource instance.
   * Use this for ownership checks, conditional visibility, etc.
   *
   * @example
   * ```typescript
   * policies: {
   *   view: definePolicy<Product>({
   *     view: (ctx, product) => product.published || product.createdById === ctx.user.id,
   *   }),
   *   update: definePolicy<Product>({
   *     update: (ctx, product) => product.createdById === ctx.user.id || ctx.org?.role === 'ADMIN',
   *   }),
   *   delete: definePolicy<Product>({
   *     delete: (ctx, product) => product.createdById === ctx.user.id || ctx.org?.role === 'OWNER',
   *   }),
   * }
   * ```
   */
  policies?: CrudPolicies<TTable>;

  /**
   * Extra custom tRPC procedures added to the generated router.
   * Use this to add non-standard actions beyond the five CRUD operations.
   *
   * @example
   * ```typescript
   * actions: {
   *   activate: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => { ... }),
   *   stats: orgProcedure.query(async ({ ctx }) => { ... }),
   * }
   * ```
   */
  actions?: Record<string, AnyProcedure>;

  /**
   * Enable soft delete behaviour.
   * Auto-detected from presence of `deletedAt` column if not set.
   */
  softDelete?: boolean;

  /** Primary key column name. Default: `'id'` */
  idColumn?: string;
}

/**
 * Options for the service's list method.
 */
export interface CrudListOptions {
  page: number;
  perPage: number;
  /** Column name to sort by (must be in the ordering whitelist if configured) */
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  /** Additional pre-computed WHERE conditions (from FiltersConfig.toWhereConditions) */
  whereConditions?: import('drizzle-orm').SQL[];
}
