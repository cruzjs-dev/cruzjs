import { getMcpServer } from './di/module';
import { McpSseTransport } from './transport/sse';
import { McpStreamableHttpTransport } from './transport/streamable-http';

export function createMcpRouteHandler(options: { serverId: string }) {
  const { serverId } = options;

  return {
    async handle(request: Request): Promise<Response> {
      const server = getMcpServer(serverId);
      if (!server) {
        return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: `MCP server "${serverId}" not found` } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { transport } = server;
      const method = request.method.toUpperCase();

      if (transport instanceof McpSseTransport) {
        if (method === 'GET') {
          return transport.handleSseConnect(request);
        }
        if (method === 'POST') {
          return transport.handleMessage(request);
        }
        if (method === 'DELETE') {
          transport.stop();
          return new Response(null, { status: 204 });
        }
      }

      if (transport instanceof McpStreamableHttpTransport) {
        return transport.handleRequest(request);
      }

      return new Response(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}
