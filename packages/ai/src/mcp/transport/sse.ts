import type { CruzContainer } from '@cruzjs/core/di';
import { McpExecutor } from '../core/executor';
import { type IMcpSessionManager, McpInMemorySessionManager } from '../core/session';
import { createJsonResponse, createMcpResponse, createSseResponse, toSseStream } from './encoder';
import type { IMcpAuth } from '../auth/mcp-auth';
import type { WireEvent } from '../core/types';

export class McpSseTransport {
  private sessions: IMcpSessionManager;
  private sseControllers = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private serverId: string,
    private container: CruzContainer,
    private auth: IMcpAuth,
    private pingIntervalMs: number = 30000,
    sessions?: IMcpSessionManager,
  ) {
    this.sessions = sessions ?? new McpInMemorySessionManager();
  }

  start(): void {
    if (this.pingIntervalMs > 0) {
      this.pingInterval = setInterval(() => this.sendPingToAll(), this.pingIntervalMs);
    }
  }

  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const [id, controller] of this.sseControllers) {
      try { controller.close(); } catch {}
    }
    this.sseControllers.clear();
  }

  async handleSseConnect(request: Request): Promise<Response> {
    const sessionId = this.sessions.generateId();
    await this.sessions.create(sessionId);

    const self = this;
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array>;

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        controller = ctrl;
        const connectedFrame = `event: session.created\ndata: ${JSON.stringify({ sessionId })}\n\n`;
        ctrl.enqueue(encoder.encode(connectedFrame));
      },
      cancel() {
        self.sseControllers.delete(sessionId);
        void self.sessions.delete(sessionId);
      },
    });

    this.sseControllers.set(sessionId, controller!);

    return createSseResponse(stream);
  }

  async handleMessage(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId || !(await this.sessions.has(sessionId))) {
      return createJsonResponse({ error: { code: 'INVALID_SESSION', message: 'Invalid or missing sessionId' } }, 400);
    }

    const authResult = await this.auth.validate(request);

    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return createJsonResponse({ error: { code: 'PARSE_ERROR', message: 'Invalid JSON' } }, 400);
    }

    const executor = new McpExecutor(
      this.serverId,
      this.container,
      request,
      authResult.userId,
      authResult.scopes,
      authResult.roles,
    );

    return this.handleJsonRpc(body, executor, sessionId);
  }

  private async handleJsonRpc(body: Record<string, unknown>, executor: McpExecutor, sessionId: string): Promise<Response> {
    const { method, params, id } = body;
    const p = params as Record<string, unknown> | undefined;

    switch (method) {
      case 'initialize':
        return createMcpResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
              resources: { subscribe: false, listChanged: true },
              prompts: { listChanged: true },
            },
            serverInfo: {
              name: this.serverId,
              version: '1.0.0',
            },
          },
        }, sessionId);

      case 'tools/list':
        return createMcpResponse({
          jsonrpc: '2.0',
          id,
          result: { tools: executor.listTools() },
        }, sessionId);

      case 'tools/call': {
        const toolName = p?.name as string;
        const args = (p?.arguments as Record<string, unknown>) ?? {};
        const result = await executor.callTool(toolName, args);
        return createMcpResponse({
          jsonrpc: '2.0',
          id,
          result,
        }, sessionId);
      }

      case 'resources/list':
        return createMcpResponse({
          jsonrpc: '2.0',
          id,
          result: { resources: executor.listResources() },
        }, sessionId);

      case 'resources/templates/list':
        return createMcpResponse({
          jsonrpc: '2.0',
          id,
          result: { resourceTemplates: executor.listResourceTemplates() },
        }, sessionId);

      case 'resources/read': {
        const uri = p?.uri as string;
        try {
          const result = await executor.readResource(uri);
          return createMcpResponse({ jsonrpc: '2.0', id, result }, sessionId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Resource read failed';
          return createMcpResponse({
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message },
          }, sessionId);
        }
      }

      case 'prompts/list':
        return createMcpResponse({
          jsonrpc: '2.0',
          id,
          result: { prompts: executor.listPrompts() },
        }, sessionId);

      case 'prompts/get': {
        const promptName = p?.name as string;
        const args = (p?.arguments as Record<string, unknown>) ?? {};
        try {
          const result = await executor.getPrompt(promptName, args);
          return createMcpResponse({ jsonrpc: '2.0', id, result }, sessionId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Prompt get failed';
          return createMcpResponse({
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message },
          }, sessionId);
        }
      }

      case 'ping':
        return createMcpResponse({ jsonrpc: '2.0', id, result: {} }, sessionId);

      default:
        return createMcpResponse({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        }, sessionId);
    }
  }

  private sendPingToAll(): void {
    const encoder = new TextEncoder();
    const frame = `event: ping\ndata: {}\n\n`;
    const data = encoder.encode(frame);

    for (const [id, controller] of this.sseControllers) {
      try {
        controller.enqueue(data);
      } catch {
        this.sseControllers.delete(id);
        void this.sessions.delete(id);
      }
    }
  }
}
