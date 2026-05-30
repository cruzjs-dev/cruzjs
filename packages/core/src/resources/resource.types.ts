/**
 * Resource Types
 *
 * Shared type definitions for the API Resources / Serializer system.
 */

// ── Pagination ──────────────────────────────────────────────────────────────

export type PaginationMeta = {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
};

export type PaginationLinks = {
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
};

// ── Resource Options ────────────────────────────────────────────────────────

export type ResourceOptions = {
  /** JSON:API type identifier (e.g., "users", "posts") */
  type: string;
};

export type FieldOptions = {
  /** Override the serialized field name */
  name?: string;
  /** Whether this is a computed field (not a direct model property) */
  computed?: boolean;
};

export type IncludeOptions = {
  /** The relation property name on the model */
  relation: string;
  /** The Resource class to use when serializing the relation */
  resource?: new (data: any) => any;
  /** Whether to skip inclusion by default (only include when requested) */
  lazy?: boolean;
};

export type SerializationContext = {
  /** Sparse fieldset: only include these fields in the output */
  fields?: string[];
  /** Relationship includes: include these relations */
  includes?: string[];
  /** Current user info for conditional fields */
  user?: { id: string; role: string };
};
