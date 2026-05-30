import { Injectable, Inject } from '@cruzjs/core/di';
import { eq, and, desc } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { dashboardLayouts } from '../database/schema';
import { TRPCError } from '@trpc/server';
import type {
  CreateDashboardInput,
  UpdateDashboardInput,
  GetDashboardInput,
  DeleteDashboardInput,
  GetWidgetDataInput,
} from './dashboard.types';

/**
 * DashboardService
 *
 * Manages dashboard layouts (CRUD + default) and widget data resolution.
 */
@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase
  ) {}

  // ==========================================================================
  // Dashboard CRUD
  // ==========================================================================

  async createDashboard(orgId: string, userId: string, input: CreateDashboardInput) {
    // If setting as default, unset other defaults first
    if (input.isDefault) {
      await this.db
        .update(dashboardLayouts)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(and(eq(dashboardLayouts.orgId, orgId), eq(dashboardLayouts.userId, userId)));
    }

    const [layout] = await this.db
      .insert(dashboardLayouts)
      .values({
        orgId,
        userId,
        name: input.name,
        widgets: JSON.stringify(input.widgets),
        isDefault: input.isDefault,
      })
      .returning();

    return this._formatLayout(layout);
  }

  async updateDashboard(orgId: string, userId: string, input: UpdateDashboardInput) {
    const existing = await this.db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.id, input.dashboardId), eq(dashboardLayouts.orgId, orgId)))
      .limit(1);

    if (existing.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Dashboard not found' });
    }

    if (existing[0].userId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the dashboard owner can update it' });
    }

    // If setting as default, unset others
    if (input.isDefault) {
      await this.db
        .update(dashboardLayouts)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(and(
          eq(dashboardLayouts.orgId, orgId),
          eq(dashboardLayouts.userId, userId)
        ));
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.name !== undefined) updates.name = input.name;
    if (input.widgets !== undefined) updates.widgets = JSON.stringify(input.widgets);
    if (input.isDefault !== undefined) updates.isDefault = input.isDefault;

    const [updated] = await this.db
      .update(dashboardLayouts)
      .set(updates)
      .where(eq(dashboardLayouts.id, input.dashboardId))
      .returning();

    return this._formatLayout(updated);
  }

  async listDashboards(orgId: string, userId: string) {
    const layouts = await this.db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.orgId, orgId), eq(dashboardLayouts.userId, userId)))
      .orderBy(desc(dashboardLayouts.updatedAt));

    return layouts.map((l) => this._formatLayout(l));
  }

  async getDashboard(orgId: string, userId: string, input: GetDashboardInput) {
    const results = await this.db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.id, input.dashboardId), eq(dashboardLayouts.orgId, orgId)))
      .limit(1);

    if (results.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Dashboard not found' });
    }

    return this._formatLayout(results[0]);
  }

  async deleteDashboard(orgId: string, userId: string, input: DeleteDashboardInput) {
    const existing = await this.db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.id, input.dashboardId), eq(dashboardLayouts.orgId, orgId)))
      .limit(1);

    if (existing.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Dashboard not found' });
    }

    if (existing[0].userId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the dashboard owner can delete it' });
    }

    await this.db.delete(dashboardLayouts).where(eq(dashboardLayouts.id, input.dashboardId));

    return { success: true };
  }

  async setDefault(orgId: string, userId: string, dashboardId: string) {
    // Unset all defaults for this user
    await this.db
      .update(dashboardLayouts)
      .set({ isDefault: false, updatedAt: new Date().toISOString() })
      .where(and(eq(dashboardLayouts.orgId, orgId), eq(dashboardLayouts.userId, userId)));

    // Set the target as default
    const [updated] = await this.db
      .update(dashboardLayouts)
      .set({ isDefault: true, updatedAt: new Date().toISOString() })
      .where(and(eq(dashboardLayouts.id, dashboardId), eq(dashboardLayouts.orgId, orgId)))
      .returning();

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Dashboard not found' });
    }

    return this._formatLayout(updated);
  }

  async getWidgetData(_orgId: string, _input: GetWidgetDataInput) {
    return { data: null };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private _formatLayout(layout: typeof dashboardLayouts.$inferSelect) {
    return {
      ...layout,
      widgets: this._parseJsonArray(layout.widgets),
    };
  }

  private _parseJsonArray(value: string | null | undefined): unknown[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }


}
