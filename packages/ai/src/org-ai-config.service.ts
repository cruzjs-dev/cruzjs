/**
 * Org AI Config Service
 *
 * Manages per-org AI provider configuration with in-memory storage.
 * Each org can configure which AI provider to use, API key overrides,
 * default models, and enable/disable the AI feature.
 */

import { injectable } from 'inversify';
import { createToken } from '@cruzjs/core/di/tokens/create-token';
import type { IAIProvider } from './providers/provider.interface';
import type { AIProviderRegistry } from './providers/registry';

export type OrgAiConfigInput = {
  provider: string;
  apiKey?: string;
  defaultModel?: string;
  maxTokensPerMonth?: number;
  enabled?: boolean;
};

type StoredOrgAiConfig = {
  provider: string;
  apiKey?: string;
  defaultModel?: string;
  enabled: boolean;
};

@injectable()
export class OrgAIConfigService {
  private configs = new Map<string, StoredOrgAiConfig>();

  /**
   * Set or update the AI configuration for an org.
   */
  setOrgConfig(orgId: string, config: OrgAiConfigInput): void {
    this.configs.set(orgId, {
      provider: config.provider,
      apiKey: config.apiKey,
      defaultModel: config.defaultModel,
      enabled: config.enabled ?? true,
    });
  }

  /**
   * Get the AI configuration for an org, or null if not configured.
   */
  getOrgConfig(orgId: string): StoredOrgAiConfig | null {
    return this.configs.get(orgId) ?? null;
  }

  /**
   * Resolve the AI provider for an org using its configuration.
   * Returns null if the org has no config, config is disabled,
   * or the provider is not registered.
   */
  forOrg(orgId: string, registry: AIProviderRegistry): IAIProvider | null {
    const config = this.configs.get(orgId);
    if (!config || !config.enabled) {
      return null;
    }
    try {
      return registry.resolve(config.provider);
    } catch {
      return null;
    }
  }

  /**
   * Remove the AI configuration for an org.
   */
  removeOrgConfig(orgId: string): void {
    this.configs.delete(orgId);
  }
}

export const ORG_AI_CONFIG_SERVICE = createToken<OrgAIConfigService>('OrgAIConfigService');
