/**
 * AI Provider Registry
 *
 * Central registry for managing multiple AI providers.
 * Providers are registered at startup and resolved by name at runtime.
 */

import { injectable } from 'inversify';
import { createToken } from '@cruzjs/core/di/tokens/create-token';
import type { IAIProvider } from './provider.interface';

@injectable()
export class AIProviderRegistry {
  private providers = new Map<string, IAIProvider>();

  /**
   * Register an AI provider instance.
   * The provider's `name` property is used as the key.
   */
  register(provider: IAIProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Resolve a provider by name.
   * Falls back to the CRUZJS_AI_PROVIDER env var, then 'openai'.
   */
  resolve(name?: string): IAIProvider {
    const key = name ?? process.env.CRUZJS_AI_PROVIDER ?? 'openai';
    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error(
        `AI provider "${key}" not registered. Available: [${this.list().join(', ')}]. ` +
        `Call registry.register(new OpenAIProvider(...)) first.`
      );
    }
    return provider;
  }

  /**
   * List all registered provider names.
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const AI_PROVIDER_REGISTRY = createToken<AIProviderRegistry>('AIProviderRegistry');
