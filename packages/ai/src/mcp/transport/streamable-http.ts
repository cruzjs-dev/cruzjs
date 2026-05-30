import type { CruzContainer } from '@cruzjs/core/di';
import { McpExecutor } from '../core/executor';
import { type IMcpSessionManager, McpInMemorySessionManager } from '../core/session';
import { createJsonResponse, createMcpResponse, toSseStream } from './encoder';
import type { IMcpAuth } from '../auth/mcp-auth';

export class McpStreamableHttpTransport {
  private sessions: IMcpSessionManager;
  private sseControllers = new Map<string, ReadableStreamDefaultController<Uint8Array>>();

  constructor(
    private serverId: string,
    private container: CruzContainer,
    private auth: IMcpAuth,
    private statelessMode: boolean = false,
    sessions?: IMcpSessionManager,
  ) {
    this.sessions = sessions ?? new McpInMemorySessionManager();
  }

  async handleRequest(request: Request): Promise<Response> {
    const method = request.method.toUpperCase();

    if (method === 'DELETE') {
      return this.handleDelete(request);
    }

    if (method === 'GET') {
      return this.handleSseStream(request);
    }

    return this.handlePost(request);
  }

  private async handlePost(request: Request): Promise<Response> {
    const authResult = await this.auth.validate(request);

    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return createJsonResponse({ error: { code: 'PARSE_ERROR', message: 'Invalid JSON' } }, 400);
    }

    const isInitialize = body?.method === 'initialize';
    let sessionId: string | undefined;

    if (this.statelessMode) {
      sessionId = undefined;
    } else if (isInitialize) {
      sessionId = this.sessions.generateId();
      await this.sessions.create(sessionId);
    } else {
      sessionId = request.headers.get('Mcp-Session-Id') ?? undefined;
      if (!sessionId || !(await this.sessions.has(sessionId))) {
        return createJsonResponse({ error: { code: 'INVALID_SESSION', message: 'Invalid or missing session' } }, 400);
      }
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

  private async handleSseStream(request: Request): Promise<Response> {
    const sessionId = request.headers.get('Mcp-Session-Id');
    if (!sessionId || !(await this.sessions.has(sessionId))) {
      return createJsonResponse({ error: { code: 'INVALID_SESSION', message: 'Invalid session' } }, 400);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
          } catch {
            clearInterval(keepAlive);
          }
        }, 30000);

        request.signal.addEventListener('abort', () => {
          clearInterval(keepAlive);
          try { controller.close(); } catch {}
        });
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Mcp-Session-Id': sessionId,
        'X-Accel-Buffering': 'no',
      },
    });
  }

  private async handleDelete(request: Request): Promise<Response> {
    const sessionId = request.headers.get('Mcp-Session-Id');
    if (sessionId) {
      await this.sessions.delete(sessionId);
      this.sseControllers.delete(sessionId);
    }
    return new Response(null, { status: 204 });
  }

  private async handleJsonRpc(body: Record<string, unknown>, executor: McpExecutor, sessionId?: string): Promise<Response> {
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
        const result = await executor.callTool(p?.name as string, (p?.arguments as Record<string, unknown>) ?? {});
        return createMcpResponse({ jsonrpc: '2.0', id, result }, sessionId);
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
        try {
          const result = await executor.readResource(p?.uri as string);
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
        try {
          const result = await executor.getPrompt(p?.name as string, (p?.arguments as Record<string, unknown>) ?? {});
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
}
