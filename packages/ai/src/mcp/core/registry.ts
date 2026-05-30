import type {
  ToolDef,
  ResourceDef,
  ResourceTemplateDef,
  PromptDef,
} from './types';

type CapabilityMap = {
  tools: Map<string, ToolDef>;
  resources: Map<string, ResourceDef>;
  resourceTemplates: Map<string, ResourceTemplateDef>;
  prompts: Map<string, PromptDef>;
};

const registries = new Map<string, CapabilityMap>();

function getRegistry(serverId: string): CapabilityMap {
  let reg = registries.get(serverId);
  if (!reg) {
    reg = {
      tools: new Map(),
      resources: new Map(),
      resourceTemplates: new Map(),
      prompts: new Map(),
    };
    registries.set(serverId, reg);
  }
  return reg;
}

export const McpRegistry = {
  registerTool(serverId: string, tool: ToolDef): void {
    getRegistry(serverId).tools.set(tool.name, tool);
  },

  registerResource(serverId: string, resource: ResourceDef): void {
    getRegistry(serverId).resources.set(resource.uri, resource);
  },

  registerResourceTemplate(serverId: string, template: ResourceTemplateDef): void {
    getRegistry(serverId).resourceTemplates.set(template.uriTemplate, template);
  },

  registerPrompt(serverId: string, prompt: PromptDef): void {
    getRegistry(serverId).prompts.set(prompt.name, prompt);
  },

  removeTool(serverId: string, name: string): boolean {
    return getRegistry(serverId).tools.delete(name);
  },

  removeResource(serverId: string, uri: string): boolean {
    return getRegistry(serverId).resources.delete(uri);
  },

  removePrompt(serverId: string, name: string): boolean {
    return getRegistry(serverId).prompts.delete(name);
  },

  getTools(serverId: string): ToolDef[] {
    return Array.from(getRegistry(serverId).tools.values());
  },

  getResources(serverId: string): ResourceDef[] {
    return Array.from(getRegistry(serverId).resources.values());
  },

  getResourceTemplates(serverId: string): ResourceTemplateDef[] {
    return Array.from(getRegistry(serverId).resourceTemplates.values());
  },

  getPrompts(serverId: string): PromptDef[] {
    return Array.from(getRegistry(serverId).prompts.values());
  },

  getTool(serverId: string, name: string): ToolDef | undefined {
    return getRegistry(serverId).tools.get(name);
  },

  getResource(serverId: string, uri: string): ResourceDef | undefined {
    return getRegistry(serverId).resources.get(uri);
  },

  getPrompt(serverId: string, name: string): PromptDef | undefined {
    return getRegistry(serverId).prompts.get(name);
  },

  clear(serverId: string): void {
    registries.delete(serverId);
  },
};
