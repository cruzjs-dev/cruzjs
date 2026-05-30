/**
 * @cruzjs/ai - Unified AI + MCP Package
 *
 * Combines provider-agnostic AI (OpenAI, Anthropic, Cloudflare Gateway,
 * OpenRouter) with the full MCP server/client stack (tools, resources,
 * prompts, SSE/streamable-HTTP transports) in a single package.
 *
 * Sub-path imports:
 *   @cruzjs/ai/providers  - Provider implementations
 *   @cruzjs/ai/hooks      - React hooks (useStream, useChat)
 *   @cruzjs/ai/mcp        - MCP server primitives
 */

// Types
export * from './types';

// Provider interface
export type {
  IAIProvider,
  AIMessage,
  ToolDef,
  ToolCall,
  ToolResult as AIToolResult,
  StreamChunk,
  ModelOptions,
  AIResponse,
} from './providers/provider.interface';

// Registry
export { AIProviderRegistry, AI_PROVIDER_REGISTRY } from './providers/registry';

// Provider implementations
export { CloudflareGatewayProvider } from './providers/cloudflare-gateway';
export type { CloudflareGatewayConfig } from './providers/cloudflare-gateway';

export { OpenAIProvider } from './providers/openai';
export type { OpenAIConfig } from './providers/openai';

export { AnthropicProvider } from './providers/anthropic';
export type { AnthropicConfig } from './providers/anthropic';

export { OpenRouterProvider } from './providers/openrouter';
export type { OpenRouterConfig } from './providers/openrouter';

// MCP Bridge
export { McpBridge } from './mcp-bridge';
export type { McpToolDef, RunWithToolsOptions, RunWithToolsResult } from './mcp-bridge';

// Org AI Config
export { OrgAIConfigService, ORG_AI_CONFIG_SERVICE } from './org-ai-config.service';
export type { OrgAiConfigInput } from './org-ai-config.service';

// Usage Tracker
export { AIUsageTracker, AI_USAGE_TRACKER } from './usage-tracker';
export type { UsageRecord, UsageSummary } from './usage-tracker';

// Container Module
export { AIContainerModule } from './ai.module';

// Database Schema
export { orgAiConfigs } from './database/schema';
export type { OrgAiConfig, NewOrgAiConfig } from './database/schema';

// tRPC Router
export { AITrpc, AITrpc as aiTrpc } from './ai.trpc';

// MCP — full server stack (also available via @cruzjs/ai/mcp)
export { McpRegistry } from './mcp/core/registry';
export { McpExecutor } from './mcp/core/executor';
export { McpSessionManager } from './mcp/core/session';

export {
  McpTool,
  McpResource,
  McpResourceTemplate,
  McpPrompt,
  McpPublic,
  McpScopes,
  McpRoles,
  discoverCapabilities,
} from './mcp/decorators/index';

export type {
  ToolOptions,
  ResourceOptions,
  ResourceTemplateOptions,
  PromptOptions,
} from './mcp/decorators/index';

export {
  McpSessionAuth,
  McpNoAuth,
  type IMcpAuth,
} from './mcp/auth/mcp-auth';

export { McpSseTransport } from './mcp/transport/sse';
export { McpStreamableHttpTransport } from './mcp/transport/streamable-http';
export {
  toSseStream,
  toNdjsonStream,
  createSseResponse,
  createJsonResponse,
  createMcpResponse,
} from './mcp/transport/encoder';

export {
  createMcpServer,
  getMcpServer,
  removeMcpServer,
  registerMcpProviders,
} from './mcp/di/module';

export { createMcpRouteHandler } from './mcp/route-handler';

export type {
  McpServerConfig,
  McpServerOptions,
  McpTransportConfig,
  McpContext,
  ResourceDef,
  ResourceTemplateDef,
  PromptDef,
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  ToolResult,
  ResourceResult,
  PromptResult,
  ContentBlock,
  WireEvent,
  WireError,
  McpAuthResult,
} from './mcp/core/types';
