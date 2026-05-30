import { isNull, eq, gte } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';
import type { Scope } from './define-scope';

export function softNotDeleted(deletedAtColumn: Column): Scope {
  return { apply: () => isNull(deletedAtColumn) };
}

export function createdAfter(createdAtColumn: Column, date: Date): Scope {
  return { apply: () => gte(createdAtColumn, date.toISOString()) };
}

export function byOrg(orgIdColumn: Column, orgId: string): Scope {
  return { apply: () => eq(orgIdColumn, orgId) };
}

export function byUser(userIdColumn: Column, userId: string): Scope {
  return { apply: () => eq(userIdColumn, userId) };
}
