import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpInMemorySessionManager } from '../core/session';

describe('McpInMemorySessionManager', () => {
  let manager: McpInMemorySessionManager;

  beforeEach(() => {
    manager = new McpInMemorySessionManager();
  });

  // ─── create / get / has ───────────────────────────────────────

  describe('create()', () => {
    it('creates a session with metadata', async () => {
      await manager.create('s1', { userId: 'u1' });
      const session = await manager.get('s1');
      expect(session).toBeDefined();
      expect(session!.metadata).toEqual({ userId: 'u1' });
      expect(session!.createdAt).toBeGreaterThan(0);
    });

    it('creates a session with empty metadata when not provided', async () => {
      await manager.create('s2');
      const session = await manager.get('s2');
      expect(session!.metadata).toEqual({});
    });
  });

  describe('has()', () => {
    it('returns true for existing session', async () => {
      await manager.create('exists');
      expect(await manager.has('exists')).toBe(true);
    });

    it('returns false for non-existent session', async () => {
      expect(await manager.has('nope')).toBe(false);
    });
  });

  describe('get()', () => {
    it('returns undefined for non-existent session', async () => {
      expect(await manager.get('ghost')).toBeUndefined();
    });
  });

  // ─── delete ───────────────────────────────────────────────────

  describe('delete()', () => {
    it('deletes an existing session', async () => {
      await manager.create('del-me');
      expect(await manager.delete('del-me')).toBe(true);
      expect(await manager.has('del-me')).toBe(false);
    });

    it('returns false for non-existent session', async () => {
      expect(await manager.delete('ghost')).toBe(false);
    });
  });

  // ─── generateId ───────────────────────────────────────────────

  describe('generateId()', () => {
    it('generates unique ids with mcp_ prefix', () => {
      const id1 = manager.generateId();
      const id2 = manager.generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^mcp_/);
    });
  });

  // ─── cleanup ──────────────────────────────────────────────────

  describe('cleanup()', () => {
    it('removes expired sessions and returns count', async () => {
      await manager.create('old', { ts: 1 });
      const session = await manager.get('old');
      if (session) {
        (session as any).createdAt = Date.now() - 100_000;
      }
      await manager.create('fresh');

      const cleaned = await manager.cleanup(30_000);
      expect(cleaned).toBe(1);
      expect(await manager.has('old')).toBe(false);
      expect(await manager.has('fresh')).toBe(true);
    });

    it('returns 0 when nothing to clean', async () => {
      await manager.create('recent');
      const cleaned = await manager.cleanup(999_999);
      expect(cleaned).toBe(0);
    });
  });
});
