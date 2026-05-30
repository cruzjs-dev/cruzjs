/**
 * Admin Registry
 *
 * Central registry for admin-managed resources. Resources are registered at
 * boot time and exposed via the admin dashboard CRUD API.
 */

import { Injectable } from '@cruzjs/core/di';
import type { AdminResourceConfig } from './admin.types';

@Injectable()
export class AdminRegistry {
  private readonly resources = new Map<string, AdminResourceConfig>();

  /**
   * Register a resource for admin management.
   * Returns `this` for fluent chaining.
   */
  register(config: AdminResourceConfig): this {
    if (this.resources.has(config.name)) {
      throw new Error(`Admin resource "${config.name}" is already registered`);
    }
    this.resources.set(config.name, {
      ...config,
      operations: config.operations ?? ['list', 'create', 'read', 'update', 'delete'],
      perPage: config.perPage ?? 20,
    });
    return this;
  }

  /** Get a single resource config by name. */
  get(name: string): AdminResourceConfig | undefined {
    return this.resources.get(name);
  }

  /** List all registered resource configs. */
  list(): AdminResourceConfig[] {
    return Array.from(this.resources.values());
  }
}
