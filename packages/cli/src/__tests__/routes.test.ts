import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { routesCommand } from '../commands/routes.command';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a temp project directory with the given files.
 * Returns the root path.
 */
function createTempProject(files: Record<string, string>): string {
  const tempDir = resolve(
    tmpdir(),
    `cruz-routes-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = resolve(tempDir, relPath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
  }

  return tempDir;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('routes command', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('tRPC procedure scanning', () => {
    it('should discover OOP class-based @Route() procedures', async () => {
      tempDir = createTempProject({
        // Standalone project structure
        'src/root.tsx': '',
        'src/features/post/post.trpc.ts': `
import { Router, Route, TrpcRouter } from '@cruzjs/core';
import { protectedProcedure } from '@cruzjs/core/trpc/context';
import { z } from 'zod';

@Router()
export class PostTrpc extends TrpcRouter {
  @Route() list = protectedProcedure.query(async ({ ctx }) => []);

  @Route() create = protectedProcedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => ({}));
}
`,
        'src/features/post/post.module.ts': `
import { Module } from '@cruzjs/core/di';
import { PostTrpc } from './post.trpc';

@Module({
  trpcRouters: {
    post: PostTrpc,
  },
})
export class PostModule {}
`,
      });

      // Capture JSON output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await routesCommand({ projectRoot: tempDir, json: true });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join('');
      consoleSpy.mockRestore();

      const parsed = JSON.parse(output);
      expect(parsed.trpc).toBeInstanceOf(Array);
      expect(parsed.trpc.length).toBeGreaterThanOrEqual(2);

      const listProc = parsed.trpc.find((p: any) => p.route === 'post.list');
      expect(listProc).toBeDefined();
      expect(listProc.type).toBe('query');
      expect(listProc.auth).toBe('protected');

      const createProc = parsed.trpc.find((p: any) => p.route === 'post.create');
      expect(createProc).toBeDefined();
      expect(createProc.type).toBe('mutation');
      expect(createProc.auth).toBe('protected');
    });

    it('should discover function-based router({}) procedures', async () => {
      tempDir = createTempProject({
        'src/root.tsx': '',
        'src/features/comment/comment.trpc.ts': `
import { router } from '@cruzjs/core/trpc';
import { orgProcedure } from '@cruzjs/core/trpc/context';
import { z } from 'zod';

export const commentTrpc = router({
  list: orgProcedure.query(async ({ ctx }) => []),
  remove: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {}),
});
`,
        'src/features/comment/comment.module.ts': `
import { Module } from '@cruzjs/core/di';
import { commentTrpc } from './comment.trpc';

@Module({
  trpcRouters: {
    comment: commentTrpc,
  },
})
export class CommentModule {}
`,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await routesCommand({ projectRoot: tempDir, json: true });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('');
      consoleSpy.mockRestore();

      const parsed = JSON.parse(output);
      const listProc = parsed.trpc.find((p: any) => p.route === 'comment.list');
      expect(listProc).toBeDefined();
      expect(listProc.type).toBe('query');
      expect(listProc.auth).toBe('org');

      const removeProc = parsed.trpc.find((p: any) => p.route === 'comment.remove');
      expect(removeProc).toBeDefined();
      expect(removeProc.type).toBe('mutation');
    });

    it('should classify public procedures correctly', async () => {
      tempDir = createTempProject({
        'src/root.tsx': '',
        'src/features/health/health.trpc.ts': `
import { Router, Route, TrpcRouter } from '@cruzjs/core';
import { publicProcedure } from '@cruzjs/core/trpc/context';

@Router()
export class HealthTrpc extends TrpcRouter {
  @Route() ping = publicProcedure.query(async () => 'pong');
}
`,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await routesCommand({ projectRoot: tempDir, json: true });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('');
      consoleSpy.mockRestore();

      const parsed = JSON.parse(output);
      const ping = parsed.trpc.find((p: any) => p.route.includes('ping'));
      expect(ping).toBeDefined();
      expect(ping.auth).toBe('public');
    });
  });

  describe('JSON output', () => {
    it('should produce parseable JSON with trpc and pages arrays', async () => {
      tempDir = createTempProject({
        'src/root.tsx': '',
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await routesCommand({ projectRoot: tempDir, json: true });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('');
      consoleSpy.mockRestore();

      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('trpc');
      expect(parsed).toHaveProperty('pages');
      expect(Array.isArray(parsed.trpc)).toBe(true);
      expect(Array.isArray(parsed.pages)).toBe(true);
    });
  });

  describe('page route scanning', () => {
    it('should discover page routes from *.routes.ts files', async () => {
      tempDir = createTempProject({
        'src/root.tsx': '',
        'src/features/blog/blog.routes.ts': `
import type { RouteFactory } from '@cruzjs/core/routing';

export const blogRoutes: RouteFactory = (helpers) => [
  ...helpers.prefix('blog', [
    helpers.index('features/blog/routes/blog._index.tsx'),
    helpers.route(':id', 'features/blog/routes/blog.$id.tsx'),
  ]),
];
`,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await routesCommand({ projectRoot: tempDir, json: true });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('');
      consoleSpy.mockRestore();

      const parsed = JSON.parse(output);
      const blogIndex = parsed.pages.find((p: any) => p.path === '/blog');
      expect(blogIndex).toBeDefined();
      expect(blogIndex.component).toContain('blog._index.tsx');
    });
  });

  describe('filter option', () => {
    it('should filter tRPC procedures by route name', async () => {
      tempDir = createTempProject({
        'src/root.tsx': '',
        'src/features/alpha/alpha.trpc.ts': `
import { Router, Route, TrpcRouter } from '@cruzjs/core';
import { protectedProcedure } from '@cruzjs/core/trpc/context';

@Router()
export class AlphaTrpc extends TrpcRouter {
  @Route() list = protectedProcedure.query(async () => []);
}
`,
        'src/features/beta/beta.trpc.ts': `
import { Router, Route, TrpcRouter } from '@cruzjs/core';
import { protectedProcedure } from '@cruzjs/core/trpc/context';

@Router()
export class BetaTrpc extends TrpcRouter {
  @Route() list = protectedProcedure.query(async () => []);
}
`,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await routesCommand({ projectRoot: tempDir, json: true, filter: 'alpha' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('');
      consoleSpy.mockRestore();

      const parsed = JSON.parse(output);
      expect(parsed.trpc.length).toBeGreaterThanOrEqual(1);
      expect(parsed.trpc.every((p: any) => p.route.includes('alpha') || p.file.includes('alpha'))).toBe(true);
    });
  });

  describe('empty project', () => {
    it('should return empty arrays for a project with no trpc files', async () => {
      tempDir = createTempProject({
        'src/root.tsx': '',
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await routesCommand({ projectRoot: tempDir, json: true });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('');
      consoleSpy.mockRestore();

      const parsed = JSON.parse(output);
      expect(parsed.trpc).toEqual([]);
    });
  });
});
