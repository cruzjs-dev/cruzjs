import type { CruzContainer } from '@cruzjs/core/di';
import { McpRegistry } from './registry';
import type {
  McpContext,
  ToolResult,
  ResourceResult,
  PromptResult,
  WireError,
} from './types';

function wireError(code: string, message: string): WireError {
  return { code, message };
}

export class McpExecutor {
  constructor(
    private serverId: string,
    private container: CruzContainer,
    private request: Request,
    private userId?: string,
    private scopes?: string[],
    private roles?: string[],
  ) {}

  listTools() {
    const tools = McpRegistry.getTools(this.serverId);
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.parameters ? this.zodToJsonSchema(t.parameters) : { type: 'object', properties: {} },
    }));
  }

  async callTool(name: string, args: any): Promise<ToolResult> {
    const tool = McpRegistry.getTool(this.serverId, name);
    if (!tool) {
      return { content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }], isError: true };
    }

    let validatedArgs = args;
    if (tool.parameters) {
      const parsed = tool.parameters.safeParse(args);
      if (!parsed.success) {
        return {
          content: [{ type: 'text' as const, text: `Invalid arguments: ${parsed.error.message}` }],
          isError: true,
        };
      }
      validatedArgs = parsed.data;
    }

    const context = this.createContext();
    try {
      this.checkAccess(tool);
      return await tool.handler(validatedArgs, context);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Tool execution failed';
      return {
        content: [{ type: 'text' as const, text: message }],
        isError: true,
      };
    }
  }

  listResources() {
    const resources = McpRegistry.getResources(this.serverId);
    return resources.map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }));
  }

  listResourceTemplates() {
    const templates = McpRegistry.getResourceTemplates(this.serverId);
    return templates.map((t) => ({
      uriTemplate: t.uriTemplate,
      name: t.name,
      description: t.description,
      mimeType: t.mimeType,
    }));
  }

  async readResource(uri: string): Promise<ResourceResult> {
    const resources = McpRegistry.getResources(this.serverId);
    const resource = resources.find((r) => r.uri === uri);

    if (resource) {
      const context = this.createContext();
      return resource.handler(uri, context);
    }

    const templates = McpRegistry.getResourceTemplates(this.serverId);
    for (const tmpl of templates) {
      const match = this.matchTemplate(tmpl.uriTemplate, uri);
      if (match !== null) {
        const context = this.createContext();
        return tmpl.handler(uri, context);
      }
    }

    throw new Error(`Resource not found: ${uri}`);
  }

  listPrompts() {
    const prompts = McpRegistry.getPrompts(this.serverId);
    return prompts.map((p) => ({
      name: p.name,
      description: p.description,
    }));
  }

  async getPrompt(name: string, args: any): Promise<PromptResult> {
    const prompt = McpRegistry.getPrompt(this.serverId, name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }

    let validatedArgs = args;
    if (prompt.parameters) {
      const parsed = prompt.parameters.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments: ${parsed.error.message}`);
      }
      validatedArgs = parsed.data;
    }

    const context = this.createContext();
    return prompt.handler(validatedArgs, context);
  }

  private createContext(): McpContext {
    const executor = this;
    return {
      container: this.container,
      request: this.request,
      reportProgress(_progress: number, _total?: number) {},
      userId: this.userId,
      scopes: this.scopes,
      roles: this.roles,
    };
  }

  private checkAccess(tool: { isPublic?: boolean; requiredScopes?: string[]; requiredRoles?: string[] }) {
    if (tool.isPublic) return;

    if (tool.requiredScopes?.length) {
      const userScopes = this.scopes ?? [];
      const missing = tool.requiredScopes.filter((s) => !userScopes.includes(s));
      if (missing.length) {
        throw new Error(`Missing required scopes: ${missing.join(', ')}`);
      }
    }

    if (tool.requiredRoles?.length) {
      const userRoles = this.roles ?? [];
      const hasRole = tool.requiredRoles.some((r) => userRoles.includes(r));
      if (!hasRole) {
        throw new Error(`Missing required role. Required one of: ${tool.requiredRoles.join(', ')}`);
      }
    }
  }

  private zodToJsonSchema(schema: any): any {
    try {
      const def = schema?._def;
      if (!def) return { type: 'object', properties: {} };
      // Zod v4: _def.type is a string ('object','string',etc); Zod v3: _def.typeName is 'ZodObject',etc
      const type = def.type ?? def.typeName;
      const isObject = type === 'object' || type === 'ZodObject';
      const isString = type === 'string' || type === 'ZodString';
      const isNumber = type === 'number' || type === 'ZodNumber';
      const isBoolean = type === 'boolean' || type === 'ZodBoolean';
      const isArray = type === 'array' || type === 'ZodArray';
      const isEnum = type === 'enum' || type === 'ZodEnum';
      const isOptional = type === 'optional' || type === 'ZodOptional';
      if (isObject) {
        const properties: Record<string, any> = {};
        const required: string[] = [];
        // Zod v4: shape is plain object; Zod v3: shape is a function
        const shape = typeof def.shape === 'function' ? def.shape() : (def.shape ?? schema.shape ?? {});
        for (const [key, value] of Object.entries(shape)) {
          properties[key] = this.zodToJsonSchema(value as any);
          if (!(value as any).isOptional?.()) {
            required.push(key);
          }
        }
        return { type: 'object', properties, required: required.length ? required : undefined };
      }
      if (isString) return { type: 'string' };
      if (isNumber) return { type: 'number' };
      if (isBoolean) return { type: 'boolean' };
      if (isArray) {
        // Zod v4: def.element; Zod v3: def.type
        const itemSchema = def.element ?? def.type;
        return { type: 'array', items: this.zodToJsonSchema(itemSchema) };
      }
      if (isEnum) {
        // Zod v4: def.entries (object); Zod v3: def.values (array)
        const enumValues = Array.isArray(def.values) ? def.values : Object.keys(def.entries ?? {});
        return { type: 'string', enum: enumValues };
      }
      if (isOptional) return this.zodToJsonSchema(def.innerType);
      return { type: 'object', properties: {} };
    } catch {
      return { type: 'object', properties: {} };
    }
  }

  private matchTemplate(template: string, uri: string): Record<string, string> | null {
    const templateParts = template.split('/');
    const uriParts = uri.split('/');
    if (templateParts.length !== uriParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < templateParts.length; i++) {
      const tPart = templateParts[i];
      const uPart = uriParts[i];
      if (tPart.startsWith('{') && tPart.endsWith('}')) {
        params[tPart.slice(1, -1)] = uPart;
      } else if (tPart !== uPart) {
        return null;
      }
    }
    return params;
  }
}
