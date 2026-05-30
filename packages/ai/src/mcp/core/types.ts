import type { ZodType } from 'zod';
import type { CruzContainer } from '@cruzjs/core/di';

export type McpServerConfig = {
  name: string;
  version: string;
  description?: string;
};

export type ToolDef = {
  name: string;
  description?: string;
  parameters?: ZodType<unknown>;
  outputSchema?: ZodType<unknown>;
  annotations?: Record<string, unknown>;
  isPublic?: boolean;
  requiredScopes?: string[];
  requiredRoles?: string[];
  handler: ToolHandler;
  providerClass?: Function;
  methodName?: string;
};

export type ResourceDef = {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: ResourceHandler;
  providerClass?: Function;
  methodName?: string;
};

export type ResourceTemplateDef = {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: ResourceHandler;
  providerClass?: Function;
  methodName?: string;
};

export type PromptDef = {
  name: string;
  description?: string;
  parameters?: ZodType<unknown>;
  handler: PromptHandler;
  providerClass?: Function;
  methodName?: string;
};

export type ToolHandler = (args: unknown, context: McpContext) => Promise<ToolResult> | ToolResult;
export type ResourceHandler = (uri: string, context: McpContext) => Promise<ResourceResult> | ResourceResult;
export type PromptHandler = (args: unknown, context: McpContext) => Promise<PromptResult> | PromptResult;

export type McpContext = {
  container: CruzContainer;
  request: Request;
  reportProgress: (progress: number, total?: number) => void;
  userId?: string;
  scopes?: string[];
  roles?: string[];
};

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: { uri: string; mimeType?: string; text?: string; blob?: string } };

export type ToolResult = {
  content: ContentBlock[];
  isError?: boolean;
};

export type ResourceResult = {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
};

export type PromptResult = {
  messages: Array<{
    role: 'user' | 'assistant';
    content: ContentBlock;
  }>;
};

export type WireEvent =
  | { type: 'session.created'; data: { sessionId: string } }
  | { type: 'tools/list'; data: { tools: Array<{ name: string; description?: string; inputSchema?: unknown }> } }
  | { type: 'tools/call.start'; data: { toolName: string; callId: string } }
  | { type: 'tools/call.progress'; data: { callId: string; progress: number; total?: number } }
  | { type: 'tools/call.complete'; data: { callId: string; result: ToolResult } }
  | { type: 'tools/call.error'; data: { callId: string; error: WireError } }
  | { type: 'resources/list'; data: { resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }> } }
  | { type: 'resources/read'; data: { uri: string; result: ResourceResult } }
  | { type: 'resources/templates/list'; data: { templates: Array<{ uriTemplate: string; name: string; description?: string; mimeType?: string }> } }
  | { type: 'prompts/list'; data: { prompts: Array<{ name: string; description?: string }> } }
  | { type: 'prompts/get'; data: { name: string; result: PromptResult } }
  | { type: 'ping'; data: {} }
  | { type: 'error'; data: WireError };

export type WireError = {
  code: string;
  message: string;
};

export type McpAuthResult = {
  authenticated: boolean;
  userId?: string;
  scopes?: string[];
  roles?: string[];
};

export type McpTransportConfig =
  | { type: 'sse'; path?: string }
  | { type: 'streamable-http'; path?: string; statelessMode?: boolean }
  | { type: 'stdio' };

export type McpServerOptions = {
  server: McpServerConfig;
  container: CruzContainer;
  transport: McpTransportConfig;
  auth?: {
    type: 'session' | 'none';
  };
};
