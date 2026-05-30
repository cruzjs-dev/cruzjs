import type { CruzContainer } from '@cruzjs/core/di';
import { discoverCapabilities } from '../decorators/index';
import { McpRegistry } from '../core/registry';
import { McpSessionAuth, McpNoAuth, type IMcpAuth } from '../auth/mcp-auth';
import { McpSseTransport } from '../transport/sse';
import { McpStreamableHttpTransport } from '../transport/streamable-http';
import type { McpServerOptions, McpTransportConfig } from '../core/types';
import { SessionService } from '@cruzjs/core/auth/session.service';

import { McpInMemorySessionManager, McpCacheSessionManager, type IMcpSessionManager } from '../core/session';
import { KVCacheServiceFactory } from '@cruzjs/core/shared/cloudflare/kv-cache.service';

type McpTransport = McpSseTransport | McpStreamableHttpTransport;
const servers = new Map<string, { transport: McpTransport; config: McpServerOptions; sessions: IMcpSessionManager }>();

export function createMcpServer(options: McpServerOptions): void {
  const { server, container, transport: transportConfig, auth: authConfig } = options;
  const serverId = server.name;

  if (servers.has(serverId)) {
    throw new Error(`MCP server "${serverId}" already exists`);
  }

  const auth = buildAuth(authConfig, container);
  const sessions = buildSessionManager(container, serverId);
  const transport = buildTransport(serverId, container, auth, transportConfig, sessions);

  servers.set(serverId, { transport, config: options, sessions });

  if (transport instanceof McpSseTransport) {
    transport.start();
  }
}

export function getMcpServer(serverId: string) {
  return servers.get(serverId);
}

export function removeMcpServer(serverId: string): void {
  servers.delete(serverId);
}

export function registerMcpProviders(
  serverId: string,
  container: CruzContainer,
  providerClasses: Function[],
): void {
  for (const ProviderClass of providerClasses) {
    let instance: any;
    try {
      instance = container.resolve(ProviderClass as any);
    } catch {
      instance = new (ProviderClass as any)();
    }
    discoverCapabilities(instance, ProviderClass, serverId);
  }
}

function buildAuth(authConfig: McpServerOptions['auth'], container: CruzContainer): IMcpAuth {
  if (!authConfig || authConfig.type === 'none') {
    return new McpNoAuth();
  }

  if (authConfig.type === 'session') {
    try {
      const sessionService = container.resolve(SessionService);
      return new McpSessionAuth(sessionService);
    } catch {
      return new McpNoAuth();
    }
  }

  return new McpNoAuth();
}

function buildSessionManager(container: CruzContainer, serverId: string): IMcpSessionManager {
  try {
    if (container.isBound(KVCacheServiceFactory)) {
      const cacheFactory = container.resolve(KVCacheServiceFactory);
      const cache = cacheFactory.create(`mcp:sessions:${serverId}`);
      // Cast to any since ICacheService and CacheBinding are structurally compatible enough for our use
      return new McpCacheSessionManager(cache as any);
    }
  } catch {
    // Fallback to in-memory
  }
  return new McpInMemorySessionManager();
}

function buildTransport(
  serverId: string,
  container: CruzContainer,
  auth: IMcpAuth,
  config: McpTransportConfig,
  sessions: IMcpSessionManager,
): McpSseTransport | McpStreamableHttpTransport {
  if (config.type === 'sse') {
    return new McpSseTransport(serverId, container, auth, 30000, sessions);
  }

  if (config.type === 'streamable-http') {
    return new McpStreamableHttpTransport(serverId, container, auth, config.statelessMode, sessions);
  }

  throw new Error(`Unsupported transport type: ${config.type}`);
}
