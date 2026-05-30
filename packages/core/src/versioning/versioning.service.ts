/**
 * Versioning Service
 *
 * Central service for managing API versions, resolving versions from requests,
 * and generating appropriate response headers for deprecated versions.
 */

import { Injectable } from '../di';
import { VersionNegotiator } from './version.negotiator';
import type { ApiVersion, VersionConfig, VersionInfo } from './versioning.types';
import { DEFAULT_VERSION_CONFIG } from './versioning.types';

@Injectable()
export class VersioningService {
  private readonly config: VersionConfig;
  private readonly negotiator: VersionNegotiator;
  private readonly versions = new Map<ApiVersion, VersionInfo>();

  constructor(config?: Partial<VersionConfig>) {
    this.config = { ...DEFAULT_VERSION_CONFIG, ...config };
    this.negotiator = new VersionNegotiator(this.config);
  }

  /**
   * Register version info (e.g. with deprecation and sunset dates).
   */
  registerVersion(info: VersionInfo): void {
    this.versions.set(info.version, info);
    if (info.sunsetDate) {
      this.negotiator.setSunsetDate(info.version, info.sunsetDate);
    }
  }

  /**
   * Get all registered versions.
   */
  getVersions(): VersionInfo[] {
    return Array.from(this.versions.values());
  }

  /**
   * Get information about a specific version.
   */
  getVersion(version: ApiVersion): VersionInfo | undefined {
    return this.versions.get(version);
  }

  /**
   * Resolve the API version from an incoming request.
   * Delegates to the VersionNegotiator based on the configured strategy.
   */
  resolveVersion(request: Request): ApiVersion {
    return this.negotiator.resolve(request);
  }

  /**
   * Generate response headers for a resolved version.
   * Adds Deprecation, Sunset, and API-Version headers as appropriate.
   */
  getResponseHeaders(version: ApiVersion): Record<string, string> {
    const headers: Record<string, string> = {
      'API-Version': version,
    };

    const info = this.versions.get(version);
    const isDeprecated = info?.deprecated ?? this.negotiator.isDeprecated(version);

    if (isDeprecated) {
      // RFC 8594 Deprecation header
      headers['Deprecation'] = 'true';

      const sunsetDate = info?.sunsetDate ?? this.negotiator.getSunsetDate(version);
      if (sunsetDate) {
        // RFC 8594 Sunset header (HTTP-date format)
        headers['Sunset'] = sunsetDate.toUTCString();
      }
    }

    return headers;
  }

  /**
   * Check if a version is supported.
   */
  isSupported(version: ApiVersion): boolean {
    return this.negotiator.isSupported(version);
  }

  /**
   * Check if a version is deprecated.
   */
  isDeprecated(version: ApiVersion): boolean {
    const info = this.versions.get(version);
    if (info) return info.deprecated;
    return this.negotiator.isDeprecated(version);
  }

  /**
   * Get the underlying negotiator (for advanced use cases).
   */
  getNegotiator(): VersionNegotiator {
    return this.negotiator;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): VersionConfig {
    return this.config;
  }
}
