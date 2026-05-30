import type { IAIProvider, ToolDef, ToolCall, AIMessage, ModelOptions } from './providers/provider.interface';
import { McpRegistry } from './mcp/core/registry';
import type { McpContext } from './mcp/core/types';

export type McpToolDef = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
};

export type RunWithToolsOptions = ModelOptions & {
  tools?: ToolDef[] | 'registry';
  serverId?: string;
  registryContext?: McpContext;
  executor?: (toolCall: ToolCall) => Promise<string>;
  maxRounds?: number;
};

export type RunWithToolsResult = {
  content: string;
  rounds: number;
};

export class McpBridge {
  static toToolDef(mcpTool: McpToolDef): ToolDef {
    return {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema ?? {},
    };
  }

  /**
   * Convert all registered tools in McpRegistry for a serverId to ToolDef[].
   * Pass directly to IAIProvider.chat() as the `tools` option.
   */
  static toolsFromRegistry(serverId: string): ToolDef[] {
    return McpRegistry.getTools(serverId).map((t) => ({
      name: t.name,
      description: t.description ?? '',
      parameters: t.parameters
        ? ((t.parameters as unknown as { shape: Record<string, unknown> }).shape ?? {})
        : {},
    }));
  }

  /**
   * Run the agentic tool-call loop.
   *
   * tools = 'registry': reads tools from McpRegistry (serverId required),
   *   dispatches calls through registered handlers automatically.
   * tools = ToolDef[]: uses provided executor function.
   */
  static async runWithTools(
    provider: IAIProvider,
    messages: AIMessage[],
    options: RunWithToolsOptions,
  ): Promise<RunWithToolsResult> {
    const { maxRounds = 5, serverId, registryContext, ...modelOptions } = options;

    let tools: ToolDef[];
    let executor: (toolCall: ToolCall) => Promise<string>;

    if (options.tools === 'registry') {
      if (!serverId) throw new Error('serverId required when tools = "registry"');
      tools = McpBridge.toolsFromRegistry(serverId);
      executor = async (toolCall) => {
        const toolDef = McpRegistry.getTool(serverId, toolCall.name);
        if (!toolDef) return JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
        if (!registryContext) return JSON.stringify({ error: 'No registryContext provided' });
        const result = await toolDef.handler(toolCall.arguments, registryContext);
        if (result.isError) return JSON.stringify({ error: result.content });
        const firstText = result.content.find((c) => c.type === 'text');
        return firstText?.type === 'text' ? firstText.text : JSON.stringify(result.content);
      };
    } else {
      tools = options.tools ?? [];
      if (!options.executor) throw new Error('executor required when tools is ToolDef[]');
      executor = options.executor;
    }

    const currentMessages = [...messages];
    let rounds = 0;

    while (rounds < maxRounds) {
      const response = await provider.chat(currentMessages, { ...modelOptions, tools });
      rounds++;

      if (!response.toolCalls || response.toolCalls.length === 0) {
        return { content: response.content, rounds };
      }

      currentMessages.push({ role: 'assistant', content: response.content });

      for (const toolCall of response.toolCalls) {
        const result = await executor(toolCall);
        currentMessages.push({
          role: 'tool',
          content: result,
          toolCallId: toolCall.id,
          name: toolCall.name,
        });
      }
    }

    const lastAssistant = [...currentMessages].reverse().find((m) => m.role === 'assistant');
    return { content: lastAssistant?.content ?? '', rounds };
  }
}
