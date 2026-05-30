/**
 * Feature Flag Database Schema
 *
 * Tables:
 * - FeatureFlag: main flag definition (org-scoped)
 * - FeatureFlagSegment: targeting rules for segment-type flags
 * - FeatureFlagOverride: per-user or per-org overrides
 */

import { createId } from '@paralleldrive/cuid2';
import { DrizzleUniversalFactory, fkRef } from '@cruzjs/drizzle-universal';
import type { UniversalBuilder, TableRef } from '@cruzjs/drizzle-universal';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createFeatureFlagSchema = DrizzleUniversalFactory.create(
  (b: UniversalBuilder, refs: { organizations: TableRef<{ id: string }>; authIdentity: TableRef<{ id: string }> }) => {
  const featureFlagsTable = b.table('FeatureFlag', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => fkRef(refs.organizations.id), { onDelete: 'cascade' }),
    createdById: b.text('createdById').notNull().references(() => fkRef(refs.authIdentity.id), { onDelete: 'cascade' }),
    key: b.text('key').notNull(),
    name: b.text('name').notNull(),
    description: b.text('description'),
    type: b.text('type').notNull().default('boolean'),
    enabled: b.boolean('enabled').notNull().default(false),
    rolloutPercentage: b.real('rolloutPercentage').default(0),
    defaultValue: b.boolean('defaultValue').notNull().default(false),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
    deletedAt: b.text('deletedAt'),
  }, (table: any) => ({
    orgIdIdx: b.index('FeatureFlag_orgId_idx').on(table.orgId),
    createdByIdIdx: b.index('FeatureFlag_createdById_idx').on(table.createdById),
    orgKeyUnique: b.uniqueIndex('FeatureFlag_orgId_key_unique').on(table.orgId, table.key),
  }));

  const featureFlagSegmentsTable = b.table('FeatureFlagSegment', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    flagId: b.text('flagId').notNull().references(() => featureFlagsTable.id, { onDelete: 'cascade' }),
    segmentType: b.text('segmentType').notNull(),
    attributeKey: b.text('attributeKey'),
    operator: b.text('operator').notNull(),
    attributeValue: b.text('attributeValue').notNull(),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    flagIdIdx: b.index('FeatureFlagSegment_flagId_idx').on(table.flagId),
  }));

  const featureFlagOverridesTable = b.table('FeatureFlagOverride', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    flagId: b.text('flagId').notNull().references(() => featureFlagsTable.id, { onDelete: 'cascade' }),
    entityType: b.text('entityType').notNull(),
    entityId: b.text('entityId').notNull(),
    value: b.boolean('value').notNull(),
    expiresAt: b.text('expiresAt'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    flagIdIdx: b.index('FeatureFlagOverride_flagId_idx').on(table.flagId),
    flagEntityUnique: b.uniqueIndex('FeatureFlagOverride_flag_entity_unique').on(table.flagId, table.entityType, table.entityId),
  }));

  return {
    featureFlags: featureFlagsTable,
    featureFlagSegments: featureFlagSegmentsTable,
    featureFlagOverrides: featureFlagOverridesTable,
  };
},
);

// ─── Re-export from database/schema (source of truth for table instances) ────

export { featureFlags, featureFlagSegments, featureFlagOverrides } from '../database/schema';

// ============================================================================
// TYPE EXPORTS (derived from factory return type to avoid circular deps)
// ============================================================================

type FeatureFlagSchemaResult = ReturnType<typeof createFeatureFlagSchema>;
export type FeatureFlag = FeatureFlagSchemaResult['featureFlags']['$inferSelect'];
export type NewFeatureFlag = FeatureFlagSchemaResult['featureFlags']['$inferInsert'];

export type FeatureFlagSegment = FeatureFlagSchemaResult['featureFlagSegments']['$inferSelect'];
export type NewFeatureFlagSegment = FeatureFlagSchemaResult['featureFlagSegments']['$inferInsert'];

export type FeatureFlagOverride = FeatureFlagSchemaResult['featureFlagOverrides']['$inferSelect'];
export type NewFeatureFlagOverride = FeatureFlagSchemaResult['featureFlagOverrides']['$inferInsert'];
