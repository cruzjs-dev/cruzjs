import type { CacheBinding } from '@cruzjs/core/runtime';

export interface McpSession {
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface IMcpSessionManager {
  create(sessionId: string, metadata?: Record<string, unknown>): Promise<void>;
  get(sessionId: string): Promise<McpSession | undefined>;
  delete(sessionId: string): Promise<boolean>;
  has(sessionId: string): Promise<boolean>;
  generateId(): string;
  cleanup(maxAgeMs?: number): Promise<number>;
}

export class McpInMemorySessionManager implements IMcpSessionManager {
  private sessions = new Map<string, McpSession>();

  async create(sessionId: string, metadata?: Record<string, unknown>): Promise<void> {
    this.sessions.set(sessionId, { createdAt: Date.now(), metadata: metadata ?? {} });
  }

  async get(sessionId: string): Promise<McpSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async has(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  generateId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async cleanup(maxAgeMs: number = 30 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }
}

export class McpCacheSessionManager implements IMcpSessionManager {
  constructor(private cache: CacheBinding, private prefix = 'mcp:session:') {}

  async create(sessionId: string, metadata?: Record<string, unknown>): Promise<void> {
    const session: McpSession = { createdAt: Date.now(), metadata: metadata ?? {} };
    await this.cache.set(this.prefix + sessionId, session, 3600); // 1 hour TTL default
  }

  async get(sessionId: string): Promise<McpSession | undefined> {
    const session = await this.cache.get<McpSession>(this.prefix + sessionId);
    return session || undefined;
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.cache.delete(this.prefix + sessionId);
  }

  async has(sessionId: string): Promise<boolean> {
    return this.cache.exists(this.prefix + sessionId);
  }

  generateId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async cleanup(): Promise<number> {
    // Cache TTL handles cleanup automatically
    return 0;
  }
}

/** Legacy export for backward compatibility */
export class McpSessionManager extends McpInMemorySessionManager {}
