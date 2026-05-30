import type { ZodType } from 'zod';
import { McpRegistry } from '../core/registry';

const MCP_TOOL_METADATA = Symbol('mcp:tool');
const MCP_RESOURCE_METADATA = Symbol('mcp:resource');
const MCP_RESOURCE_TEMPLATE_METADATA = Symbol('mcp:resourceTemplate');
const MCP_PROMPT_METADATA = Symbol('mcp:prompt');
const MCP_PUBLIC_METADATA = Symbol('mcp:public');
const MCP_SCOPES_METADATA = Symbol('mcp:scopes');
const MCP_ROLES_METADATA = Symbol('mcp:roles');

export type ToolOptions = {
  name: string;
  description?: string;
  parameters?: ZodType<unknown>;
  outputSchema?: ZodType<unknown>;
  annotations?: Record<string, unknown>;
};

export function McpTool(options: ToolOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(MCP_TOOL_METADATA, options, target, propertyKey);
  };
}

export type ResourceOptions = {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
};

export function McpResource(options: ResourceOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(MCP_RESOURCE_METADATA, options, target, propertyKey);
  };
}

export type ResourceTemplateOptions = {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
};

export function McpResourceTemplate(options: ResourceTemplateOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(MCP_RESOURCE_TEMPLATE_METADATA, options, target, propertyKey);
  };
}

export type PromptOptions = {
  name: string;
  description?: string;
  parameters?: ZodType<unknown>;
};

export function McpPrompt(options: PromptOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(MCP_PROMPT_METADATA, options, target, propertyKey);
  };
}

export function McpPublic() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(MCP_PUBLIC_METADATA, true, target, propertyKey);
  };
}

export function McpScopes(scopes: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(MCP_SCOPES_METADATA, scopes, target, propertyKey);
  };
}

export function McpRoles(roles: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(MCP_ROLES_METADATA, roles, target, propertyKey);
  };
}

export function discoverCapabilities(providerInstance: any, providerClass: Function, serverId: string): void {
  const prototype = providerClass.prototype;
  if (!prototype) return;

  for (const methodName of Object.getOwnPropertyNames(prototype)) {
    if (methodName === 'constructor') continue;

    const toolMeta = Reflect.getOwnMetadata(MCP_TOOL_METADATA, prototype, methodName);
    if (toolMeta) {
      McpRegistry.registerTool(serverId, {
        name: toolMeta.name,
        description: toolMeta.description,
        parameters: toolMeta.parameters,
        outputSchema: toolMeta.outputSchema,
        annotations: toolMeta.annotations,
        isPublic: Reflect.getOwnMetadata(MCP_PUBLIC_METADATA, prototype, methodName) ?? false,
        requiredScopes: Reflect.getOwnMetadata(MCP_SCOPES_METADATA, prototype, methodName),
        requiredRoles: Reflect.getOwnMetadata(MCP_ROLES_METADATA, prototype, methodName),
        handler: (args, ctx) => (providerInstance as any)[methodName](args, ctx),
        providerClass,
        methodName,
      });
    }

    const resourceMeta = Reflect.getOwnMetadata(MCP_RESOURCE_METADATA, prototype, methodName);
    if (resourceMeta) {
      McpRegistry.registerResource(serverId, {
        uri: resourceMeta.uri,
        name: resourceMeta.name,
        description: resourceMeta.description,
        mimeType: resourceMeta.mimeType,
        handler: (uri, ctx) => (providerInstance as any)[methodName](uri, ctx),
        providerClass,
        methodName,
      });
    }

    const templateMeta = Reflect.getOwnMetadata(MCP_RESOURCE_TEMPLATE_METADATA, prototype, methodName);
    if (templateMeta) {
      McpRegistry.registerResourceTemplate(serverId, {
        uriTemplate: templateMeta.uriTemplate,
        name: templateMeta.name,
        description: templateMeta.description,
        mimeType: templateMeta.mimeType,
        handler: (uri, ctx) => (providerInstance as any)[methodName](uri, ctx),
        providerClass,
        methodName,
      });
    }

    const promptMeta = Reflect.getOwnMetadata(MCP_PROMPT_METADATA, prototype, methodName);
    if (promptMeta) {
      McpRegistry.registerPrompt(serverId, {
        name: promptMeta.name,
        description: promptMeta.description,
        parameters: promptMeta.parameters,
        handler: (args, ctx) => (providerInstance as any)[methodName](args, ctx),
        providerClass,
        methodName,
      });
    }
  }
}
