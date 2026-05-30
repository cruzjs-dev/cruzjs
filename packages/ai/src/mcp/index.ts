export { McpRegistry } from './core/registry';
export { McpExecutor } from './core/executor';
export { McpSessionManager } from './core/session';

export {
  McpTool,
  McpResource,
  McpResourceTemplate,
  McpPrompt,
  McpPublic,
  McpScopes,
  McpRoles,
  discoverCapabilities,
} from './decorators/index';

export type {
  ToolOptions,
  ResourceOptions,
  ResourceTemplateOptions,
  PromptOptions,
} from './decorators/index';

export {
  McpSessionAuth,
  McpNoAuth,
  type IMcpAuth,
} from './auth/mcp-auth';

export { McpSseTransport } from './transport/sse';
export { McpStreamableHttpTransport } from './transport/streamable-http';
export {
  toSseStream,
  toNdjsonStream,
  createSseResponse,
  createJsonResponse,
  createMcpResponse,
} from './transport/encoder';

export {
  createMcpServer,
  getMcpServer,
  removeMcpServer,
  registerMcpProviders,
} from './di/module';

export { createMcpRouteHandler } from './route-handler';

export type {
  McpServerConfig,
  McpServerOptions,
  McpTransportConfig,
  McpContext,
  ToolDef as McpToolDefRaw,
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
} from './core/types';
