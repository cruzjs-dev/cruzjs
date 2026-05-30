/**
 * Version Negotiator
 *
 * Resolves the requested API version from incoming requests
 * based on the configured strategy (header, URL path, or query param).
 */

import { Injectable } from '../di';
import type { ApiVersion, VersionConfig } from './versioning.types';
import { DEFAULT_VERSION_CONFIG, VersionStrategy } from './versioning.types';

@Injectable()
export class VersionNegotiator {
  private readonly config: VersionConfig;
  private readonly sunsetDates = new Map<ApiVersion, Date>();

  constructor(config?: Partial<VersionConfig>) {
    this.config = { ...DEFAULT_VERSION_CONFIG, ...config };
  }

  /**
   * Resolve the API version from the incoming request based on the configured strategy.
   * Falls back to the default version if no version is specified.
   * Throws if the resolved version is not supported.
   */
  resolve(request: Request): ApiVersion {
    let version: ApiVersion | undefined;

    switch (this.config.strategy) {
      case VersionStrategy.HEADER:
        version = this.resolveFromHeader(request);
        break;
      case VersionStrategy.URL_PATH:
        version = this.resolveFromUrlPath(request);
        break;
      case VersionStrategy.QUERY_PARAM:
        version = this.resolveFromQueryParam(request);
        break;
    }

    const resolved = version ?? this.config.defaultVersion ?? this.config.current;

    if (!this.isSupported(resolved)) {
      throw new Error(`API version "${resolved}" is not supported. Supported versions: ${this.config.supported.join(', ')}`);
    }

    return resolved;
  }

  /**
   * Check whether a version is in the supported list.
   */
  isSupported(version: ApiVersion): boolean {
    return this.config.supported.includes(version);
  }

  /**
   * Check whether a version has been marked as deprecated.
   */
  isDeprecated(version: ApiVersion): boolean {
    return this.config.deprecated?.includes(version) ?? false;
  }

  /**
   * Get the sunset date for a deprecated version.
   */
  getSunsetDate(version: ApiVersion): Date | undefined {
    return this.sunsetDates.get(version);
  }

  /**
   * Register a sunset date for a deprecated version.
   */
  setSunsetDate(version: ApiVersion, date: Date): void {
    this.sunsetDates.set(version, date);
  }

  /**
   * Get the current configuration.
   */
  getConfig(): VersionConfig {
    return this.config;
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private resolveFromHeader(request: Request): ApiVersion | undefined {
    const headerName = this.config.headerName ?? 'Accept-Version';
    const value = request.headers.get(headerName);
    return this.parseVersion(value);
  }

  private resolveFromUrlPath(request: Request): ApiVersion | undefined {
    const url = new URL(request.url);
    // Match /v1/, /v2/, etc. in the path
    const match = url.pathname.match(/\/(v\d+)(?:\/|$)/);
    return match ? (match[1] as ApiVersion) : undefined;
  }

  private resolveFromQueryParam(request: Request): ApiVersion | undefined {
    const paramName = this.config.queryParam ?? 'version';
    const url = new URL(request.url);
    const value = url.searchParams.get(paramName);
    return this.parseVersion(value);
  }

  private parseVersion(value: string | null | undefined): ApiVersion | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    // Accept both "v1" and "1" formats
    if (/^v\d+$/.test(trimmed)) return trimmed as ApiVersion;
    if (/^\d+$/.test(trimmed)) return `v${trimmed}` as ApiVersion;
    return undefined;
  }
}
