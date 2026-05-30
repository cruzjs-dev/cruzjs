/**
 * Admin Dashboard Types
 *
 * Configuration types for the generic admin resource management system.
 * Resources are registered at startup and managed via a unified CRUD API.
 */

export interface AdminResourceConfig<T = any> {
  /** The name (e.g., 'users', 'orders') */
  name: string;
  /** The Drizzle table */
  table: any;
  /** Column configuration */
  columns: AdminColumnConfig[];
  /** Allowed operations */
  operations?: ('list' | 'create' | 'read' | 'update' | 'delete')[];
  /** Custom actions per row */
  rowActions?: AdminRowAction[];
  /** Bulk actions */
  bulkActions?: AdminBulkAction[];
  /** Default sort */
  defaultSort?: { column: string; direction: 'asc' | 'desc' };
  /** Items per page */
  perPage?: number;
  /** Filter configuration */
  filters?: AdminFilterConfig[];
  /** Permission required to access (default: admin only) */
  permission?: string;
}

export interface AdminColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'image' | 'link' | 'json';
  sortable?: boolean;
  searchable?: boolean;
  hidden?: boolean;
  /** Max display length */
  truncate?: number;
  format?: (value: unknown) => string;
}

export interface AdminFilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date_range' | 'boolean';
  options?: Array<{ value: string; label: string }>;
}

export interface AdminRowAction {
  key: string;
  label: string;
  icon?: string;
  confirm?: string;
  handler: (id: string) => Promise<void>;
  visible?: (row: any) => boolean;
}

export interface AdminBulkAction {
  key: string;
  label: string;
  confirm?: string;
  handler: (ids: string[]) => Promise<void>;
}

export interface AdminListResult<T = any> {
  rows: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface AdminStats {
  resource: string;
  count: number;
  /** Count of records created in the last 7 days */
  recentCount: number;
  trend: 'up' | 'down' | 'stable';
}
