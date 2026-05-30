/**
 * CRUD Filter System
 *
 * Declarative field-level filtering for CRUD list endpoints.
 * Generates both a Zod input schema AND Drizzle WHERE conditions from the same config.
 *
 * Filter operators:
 * - `exact`      → exact equality match (eq)
 * - `search`     → substring match (LIKE %value%)
 * - `range`      → numeric min/max (generates `${field}Min` + `${field}Max` fields)
 * - `date-range` → ISO string range (generates `${field}After` + `${field}Before` fields)
 * - `in`         → array contains (IN (...))
 * - `boolean`    → boolean equality
 *
 * @example
 * ```typescript
 * const { Service, Trpc, RestRouter } = createCrud({
 *   name: 'Products',
 *   table: products,
 *   scope: 'org',
 *   createSchema: ...,
 *   updateSchema: ...,
 *   filters: defineFilters(products, {
 *     name: 'search',
 *     status: 'exact',
 *     price: 'range',
 *     category: 'in',
 *     active: 'boolean',
 *     createdAt: 'date-range',
 *   }),
 *   ordering: ['name', 'price', 'createdAt'],
 * });
 *
 * // tRPC: trpc.products.list({ name: 'widget', priceMin: 10, orderBy: 'price', orderDir: 'desc' })
 * // REST: GET /api/products?name=widget&priceMin=10&orderBy=price&orderDir=desc
 * ```
 */

import { eq, like, gte, lte, inArray } from 'drizzle-orm';
import type { Table, TableConfig, SQL } from 'drizzle-orm';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Supported filter operators.
 */
export type FilterOp =
  | 'exact'
  | 'search'
  | 'range'
  | 'date-range'
  | 'in'
  | 'boolean';

// ─── FiltersConfig class ──────────────────────────────────────────────────────

export class FiltersConfig<TTable extends Table<TableConfig>> {
  constructor(private readonly config: Record<string, FilterOp>) {}

  /**
   * Build a Zod object schema for the filter input fields.
   * Merge this into your list input schema.
   */
  toSchema(): z.ZodObject<z.ZodRawShape> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape: Record<string, any> = {};

    for (const [field, op] of Object.entries(this.config)) {
      switch (op) {
        case 'exact':
          shape[field] = z.string().optional();
          break;
        case 'search':
          shape[field] = z.string().optional();
          break;
        case 'range':
          shape[`${field}Min`] = z.coerce.number().optional();
          shape[`${field}Max`] = z.coerce.number().optional();
          break;
        case 'date-range':
          shape[`${field}After`] = z.string().optional();
          shape[`${field}Before`] = z.string().optional();
          break;
        case 'in':
          // Accept comma-separated string (REST) or array (tRPC)
          shape[field] = z.union([z.array(z.string()), z.string()]).optional();
          break;
        case 'boolean':
          shape[field] = z.coerce.boolean().optional();
          break;
      }
    }

    return z.object(shape);
  }

  /**
   * Translate a validated input object into Drizzle WHERE conditions.
   * Works with both tRPC (typed) and REST (string query params) input.
   */
  toWhereConditions(table: TTable, input: Record<string, unknown>): SQL[] {
    const conditions: SQL[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableAny = table as any;

    for (const [field, op] of Object.entries(this.config)) {
      const col = tableAny[field];
      if (col === undefined) continue;

      switch (op) {
        case 'exact': {
          const val = input[field];
          if (val !== undefined && val !== null && val !== '') {
            conditions.push(eq(col, val));
          }
          break;
        }

        case 'search': {
          const val = input[field];
          if (val && typeof val === 'string' && val.trim()) {
            conditions.push(like(col, `%${val.trim()}%`));
          }
          break;
        }

        case 'range': {
          const rawMin = input[`${field}Min`];
          const rawMax = input[`${field}Max`];
          const min = rawMin !== undefined && rawMin !== '' ? Number(rawMin) : undefined;
          const max = rawMax !== undefined && rawMax !== '' ? Number(rawMax) : undefined;
          if (min !== undefined && !isNaN(min)) conditions.push(gte(col, min));
          if (max !== undefined && !isNaN(max)) conditions.push(lte(col, max));
          break;
        }

        case 'date-range': {
          const after = input[`${field}After`];
          const before = input[`${field}Before`];
          if (after && typeof after === 'string') conditions.push(gte(col, after));
          if (before && typeof before === 'string') conditions.push(lte(col, before));
          break;
        }

        case 'in': {
          const val = input[field];
          // Handle both array (tRPC) and comma-separated string (REST query params)
          const arr = Array.isArray(val)
            ? val
            : typeof val === 'string' && val
              ? val.split(',').map((s) => s.trim()).filter(Boolean)
              : [];
          if (arr.length > 0) {
            conditions.push(inArray(col, arr));
          }
          break;
        }

        case 'boolean': {
          const val = input[field];
          if (val !== undefined && val !== null && val !== '') {
            // Coerce string 'true'/'false' for REST
            const boolVal =
              typeof val === 'string' ? val === 'true' || val === '1' : Boolean(val);
            conditions.push(eq(col, boolVal));
          }
          break;
        }
      }
    }

    return conditions;
  }
}

// ─── defineFilters ────────────────────────────────────────────────────────────

/**
 * Define filter operators for a Drizzle table's columns.
 * The first argument (table) is used only for TypeScript column name inference.
 *
 * @example
 * ```typescript
 * const productFilters = defineFilters(products, {
 *   name: 'search',
 *   status: 'exact',
 *   price: 'range',
 *   category: 'in',
 * });
 *
 * // Use in createCrud:
 * createCrud({ ..., filters: productFilters })
 * ```
 */
export function defineFilters<TTable extends Table<TableConfig>>(
  _table: TTable,
  config: Partial<Record<keyof TTable['$inferSelect'] & string, FilterOp>>,
): FiltersConfig<TTable> {
  return new FiltersConfig<TTable>(config as Record<string, FilterOp>);
}
