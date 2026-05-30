/**
 * Maintenance Service
 *
 * Manages maintenance mode state via KV cache.
 * Supports enable/disable, bypass via secret (query param or cookie),
 * and public status queries.
 */
import { injectable, inject } from 'inversify';
import { getToken } from '../di/tokens/token-registry';
import {
  KVCacheService,
  KVCacheServiceFactory,
} from '../shared/cloudflare/kv-cache.service';
import type {
  MaintenanceState,
  MaintenanceStatus,
} from './maintenance.types';
import {
  DEFAULT_MAINTENANCE_STATE,
  MAINTENANCE_STATE_KEY,
  MAINTENANCE_BYPASS_COOKIE,
} from './maintenance.types';

@injectable()
export class MaintenanceService {
  private readonly cache: KVCacheService;

  constructor(
    @inject(getToken(KVCacheServiceFactory)!) cacheFactory: KVCacheServiceFactory,
  ) {
    this.cache = cacheFactory.create('maintenance');
  }

  /**
   * Enable maintenance mode.
   */
  async enable(options: {
    message: string;
    retryAfter?: number;
    secret?: string;
    enabledBy?: string;
  }): Promise<void> {
    const state: MaintenanceState = {
      active: true,
      message: options.message,
      retryAfter: options.retryAfter ?? 3600,
      secret: options.secret ?? null,
      enabledAt: new Date().toISOString(),
      enabledBy: options.enabledBy ?? null,
    };
    await this.cache.set(MAINTENANCE_STATE_KEY, state);
  }

  /**
   * Disable maintenance mode.
   */
  async disable(): Promise<void> {
    await this.cache.set(MAINTENANCE_STATE_KEY, DEFAULT_MAINTENANCE_STATE);
  }

  /**
   * Get public status (no secret exposed).
   */
  async getStatus(): Promise<MaintenanceStatus> {
    const state = await this.getState();
    if (!state.active) {
      return { active: false };
    }
    return {
      active: true,
      message: state.message,
      retryAfter: state.retryAfter,
      enabledAt: state.enabledAt ?? undefined,
    };
  }

  /**
   * Check if maintenance mode is currently active.
   */
  async isActive(): Promise<boolean> {
    const state = await this.getState();
    return state.active;
  }

  /**
   * Check if a request should bypass maintenance mode.
   * Checks `?bypass=<secret>` query param and `maintenance_bypass` cookie.
   *
   * Returns true if the request is bypassed (should proceed normally).
   */
  async isBypassed(request: Request): Promise<boolean> {
    const state = await this.getState();

    // No secret configured — bypass not possible
    if (!state.secret) {
      return false;
    }

    // Check query param
    const url = new URL(request.url);
    const bypassParam = url.searchParams.get('bypass');
    if (bypassParam === state.secret) {
      return true;
    }

    // Check cookie
    const cookieHeader = request.headers.get('cookie') ?? '';
    const bypassCookie = parseCookieValue(cookieHeader, MAINTENANCE_BYPASS_COOKIE);
    if (bypassCookie === state.secret) {
      return true;
    }

    return false;
  }

  /**
   * Get the full internal state. Used by middleware to access the secret
   * for setting the bypass cookie.
   */
  async getState(): Promise<MaintenanceState> {
    const state = await this.cache.get<MaintenanceState>(MAINTENANCE_STATE_KEY);
    return state ?? DEFAULT_MAINTENANCE_STATE;
  }
}

/**
 * Parse a single cookie value from a Cookie header string.
 */
function parseCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${escapeRegExp(name)}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
