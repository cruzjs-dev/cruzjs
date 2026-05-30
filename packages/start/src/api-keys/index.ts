// Types
export type {
  CreateApiKeyInput,
  ApiKeyResponse,
  ApiKeyCreatedResponse,
  ValidatedApiKey,
  ApiKeyContext,
  ApiKeyUsageStats,
} from './api-key.types';
export {
  createApiKeySchema,
  revokeApiKeySchema,
  getApiKeySchema,
} from './api-key.types';

// Service
export { ApiKeyService } from './api-key.service';

// Router
export { apiKeyTrpc } from './api-key.trpc';

// Middleware & Scope Authorization
export { apiKeyProcedure, checkRateLimit, hasScope, requireApiKeyScope } from './api-key.middleware';

// Dual-Auth Procedure (session OR API key)
export { apiTokenProcedure } from './api-token.procedure';

// Module
export { ApiKeyModule } from './api-key.module';

// Components
export * from './components';
