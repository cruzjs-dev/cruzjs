import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'reflect-metadata';
import { OrgAIConfigService } from '../org-ai-config.service';
import { AIProviderRegistry } from '../providers/registry';
import type { IAIProvider } from '../providers/provider.interface';

function createMockProvider(name: string): IAIProvider {
  return {
    name,
    chat: vi.fn(),
    stream: vi.fn() as unknown as IAIProvider['stream'],
    embed: vi.fn(),
  };
}

describe('OrgAIConfigService', () => {
  let service: OrgAIConfigService;
  let registry: AIProviderRegistry;

  beforeEach(() => {
    service = new OrgAIConfigService();
    registry = new AIProviderRegistry();
  });

  describe('setOrgConfig() + getOrgConfig()', () => {
    it('round-trips config data', () => {
      service.setOrgConfig('org-1', {
        provider: 'openai',
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o',
        enabled: true,
      });

      const config = service.getOrgConfig('org-1');

      expect(config).toEqual({
        provider: 'openai',
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o',
        enabled: true,
      });
    });

    it('defaults enabled to true when not specified', () => {
      service.setOrgConfig('org-2', {
        provider: 'anthropic',
      });

      const config = service.getOrgConfig('org-2');
      expect(config?.enabled).toBe(true);
    });

    it('returns null for unknown org', () => {
      expect(service.getOrgConfig('nonexistent')).toBeNull();
    });

    it('overwrites existing config', () => {
      service.setOrgConfig('org-1', { provider: 'openai' });
      service.setOrgConfig('org-1', { provider: 'anthropic', defaultModel: 'claude-sonnet-4-20250514' });

      const config = service.getOrgConfig('org-1');
      expect(config?.provider).toBe('anthropic');
      expect(config?.defaultModel).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('forOrg()', () => {
    it('returns provider when config exists and is enabled', () => {
      const mockProvider = createMockProvider('openai');
      registry.register(mockProvider);

      service.setOrgConfig('org-1', {
        provider: 'openai',
        enabled: true,
      });

      const result = service.forOrg('org-1', registry);
      expect(result).toBe(mockProvider);
    });

    it('returns null for missing org', () => {
      const result = service.forOrg('nonexistent', registry);
      expect(result).toBeNull();
    });

    it('returns null when config is disabled', () => {
      const mockProvider = createMockProvider('openai');
      registry.register(mockProvider);

      service.setOrgConfig('org-1', {
        provider: 'openai',
        enabled: false,
      });

      const result = service.forOrg('org-1', registry);
      expect(result).toBeNull();
    });

    it('returns null when provider is not registered in the registry', () => {
      service.setOrgConfig('org-1', {
        provider: 'unknown-provider',
        enabled: true,
      });

      const result = service.forOrg('org-1', registry);
      expect(result).toBeNull();
    });
  });

  describe('removeOrgConfig()', () => {
    it('removes the config for an org', () => {
      service.setOrgConfig('org-1', { provider: 'openai' });
      expect(service.getOrgConfig('org-1')).not.toBeNull();

      service.removeOrgConfig('org-1');
      expect(service.getOrgConfig('org-1')).toBeNull();
    });

    it('does not throw when removing nonexistent org', () => {
      expect(() => service.removeOrgConfig('nonexistent')).not.toThrow();
    });
  });
});
