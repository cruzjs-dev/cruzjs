/**
 * AI Container Module
 *
 * Registers all AI services into the Inversify container.
 * Load this module into your app container to enable AI features.
 *
 * @example
 * ```typescript
 * import { AIContainerModule } from '@cruzjs/ai';
 * container.load(AIContainerModule);
 * ```
 */

import { ContainerModule } from 'inversify';
import { AIProviderRegistry, AI_PROVIDER_REGISTRY } from './providers/registry';
import { OrgAIConfigService, ORG_AI_CONFIG_SERVICE } from './org-ai-config.service';
import { AIUsageTracker, AI_USAGE_TRACKER } from './usage-tracker';

export const AIContainerModule = new ContainerModule((options) => {
  options.bind(AI_PROVIDER_REGISTRY).to(AIProviderRegistry).inSingletonScope();
  options.bind(AIProviderRegistry).toSelf().inSingletonScope();
  options.bind(ORG_AI_CONFIG_SERVICE).to(OrgAIConfigService).inSingletonScope();
  options.bind(OrgAIConfigService).toSelf().inSingletonScope();
  options.bind(AI_USAGE_TRACKER).to(AIUsageTracker).inSingletonScope();
  options.bind(AIUsageTracker).toSelf().inSingletonScope();
});
