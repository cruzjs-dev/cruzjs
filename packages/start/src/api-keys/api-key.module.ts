import { Module } from '@cruzjs/core/di';
import { ApiKeyService } from './api-key.service';
import { apiKeyTrpc } from './api-key.trpc';

/**
 * ApiKey Module
 *
 * Registers the ApiKeyService and apiKeyTrpc for org-scoped
 * API key management and authentication.
 */
@Module({
  providers: [ApiKeyService],
  trpcRouters: {
    apiKey: apiKeyTrpc,
  },
})
export class ApiKeyModule {}
