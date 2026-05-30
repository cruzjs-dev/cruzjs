/**
 * E2E Tests -- Adapter HTTP Server Integration
 *
 * These tests verify that each adapter can:
 * 1. Initialize and configure services
 * 2. Handle HTTP requests through a local Node.js HTTP server
 * 3. Use cache, queue, and other bindings during request handling
 * 4. Properly clean up resources
 *
 * Each adapter is tested in isolation with its own server instance.
 * The tests use in-memory bindings (no real cloud resources required).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { RuntimeAdapter } from '../types';

import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import { AWSLambdaAdapter, AWSFargateAdapter } from '@cruzjs/adapter-aws';
import {
  GCPCloudRunAdapter,
  GCPCloudFunctionsAdapter,
} from '@cruzjs/adapter-gcp';
import {
  AzureFunctionsAdapter,
  AzureContainerAppsAdapter,
} from '@cruzjs/adapter-azure';
import { DigitalOceanAppPlatformAdapter } from '@cruzjs/adapter-digitalocean';
import { DockerAdapter } from '@cruzjs/adapter-docker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startServer(
  adapter: RuntimeAdapter,
): Promise<{ server: Server; port: number; url: string }> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://localhost`);

      // ── Health check ────────────────────────────────────────────────
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            adapter: adapter.name,
            type: adapter.type,
            diagnostics: adapter.diagnostics,
          }),
        );
        return;
      }

      // ── Cache basic get/set ─────────────────────────────────────────
      if (url.pathname === '/cache-test') {
        const cache = adapter.getCache('test');
        await cache.set('hello', 'world');
        const value = await cache.get('hello');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ cached: value }));
        return;
      }

      // ── Queue send + synchronous consumer ───────────────────────────
      if (url.pathname === '/queue-test') {
        // getQueue creates the local queue entry; getLocalQueue returns it
        const queue = adapter.getQueue('test-queue');
        const localQueue = adapter.getLocalQueue('test-queue');

        let received: unknown = null;
        if (localQueue) {
          localQueue.onMessage(async (msg) => {
            received = msg;
          });
        }

        await queue.send({ type: 'test', data: 'hello' });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sent: true, received }));
        return;
      }

      // ── Cache namespace isolation ───────────────────────────────────
      if (url.pathname === '/cache-isolation') {
        const cache1 = adapter.getCache('ns1');
        const cache2 = adapter.getCache('ns2');
        await cache1.set('key', 'value1');
        await cache2.set('key', 'value2');
        const v1 = await cache1.get('key');
        const v2 = await cache2.get('key');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ns1: v1, ns2: v2 }));
        return;
      }

      // ── Cache TTL expiration ────────────────────────────────────────
      if (url.pathname === '/cache-ttl') {
        const cache = adapter.getCache('ttl-test');
        // Set with 1-second TTL
        await cache.set('ephemeral', 'here-now', 1);
        const before = await cache.get('ephemeral');

        // Set with long TTL -- should still be present
        await cache.set('durable', 'stays', 3600);
        const durable = await cache.get('durable');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ before, durable }));
        return;
      }

      // ── Cache increment / decrement ─────────────────────────────────
      if (url.pathname === '/cache-counter') {
        const cache = adapter.getCache('counter');
        const a = await cache.increment('hits');
        const b = await cache.increment('hits');
        const c = await cache.increment('hits', 5);
        const d = await cache.decrement('hits', 2);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ a, b, c, d }));
        return;
      }

      // ── Cache delete / exists ───────────────────────────────────────
      if (url.pathname === '/cache-delete') {
        const cache = adapter.getCache('del-test');
        await cache.set('x', '1');
        const existsBefore = await cache.exists('x');
        await cache.delete('x');
        const existsAfter = await cache.exists('x');
        const getAfter = await cache.get('x');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ existsBefore, existsAfter, getAfter }));
        return;
      }

      // ── Queue batch send ────────────────────────────────────────────
      if (url.pathname === '/queue-batch') {
        const queue = adapter.getQueue('batch-queue');
        const localQueue = adapter.getLocalQueue('batch-queue');

        const received: unknown[] = [];
        if (localQueue) {
          localQueue.onMessage(async (msg) => {
            received.push(msg);
          });
        }

        await queue.sendBatch([
          { body: { id: 1 } },
          { body: { id: 2 } },
          { body: { id: 3 } },
        ]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ count: received.length, received }));
        return;
      }

      // ── Integration: queue consumer writes to cache ─────────────────
      if (url.pathname === '/integration') {
        // Use a single cache instance so the consumer and reader share state
        const cache = adapter.getCache('integration');
        const queue = adapter.getQueue('integration-queue');
        const localQueue = adapter.getLocalQueue('integration-queue');

        let queueResult: string | null = null;
        if (localQueue) {
          localQueue.onMessage(async (msg: any) => {
            // Consumer processes the message and writes to the shared cache
            await cache.set('from-queue', msg.data);
            queueResult = msg.data;
          });
        }

        // Send a message -- the in-memory queue invokes the consumer synchronously
        await queue.send({ data: 'integrated' });

        // Read what the consumer wrote (same cache instance)
        const fromQueue = await cache.get('from-queue');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ fromQueue, queueResult }));
        return;
      }

      // ── Diagnostics endpoint ────────────────────────────────────────
      if (url.pathname === '/diagnostics') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            diagnostics: adapter.diagnostics,
            hasAI: adapter.getAI() !== null,
            database: adapter.getDatabase(),
            storageBucket: adapter.getStorageBucket(),
          }),
        );
        return;
      }

      // ── waitUntil fire-and-forget ───────────────────────────────────
      if (url.pathname === '/wait-until') {
        let completed = false;
        adapter.waitUntil(
          new Promise<void>((resolve) => {
            completed = true;
            resolve();
          }),
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ accepted: true, completed }));
        return;
      }

      // ── 404 fallthrough ─────────────────────────────────────────────
      res.writeHead(404);
      res.end('Not Found');
    });

    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, port, url: `http://localhost:${port}` });
    });
  });
}

async function fetchJSON(url: string): Promise<any> {
  const resp = await fetch(url);
  return resp.json();
}

// ---------------------------------------------------------------------------
// Adapter factory list
// ---------------------------------------------------------------------------

const adapters: Array<{ name: string; create: () => RuntimeAdapter }> = [
  { name: 'CloudflareAdapter', create: () => new CloudflareAdapter() },
  { name: 'AWSLambdaAdapter', create: () => new AWSLambdaAdapter() },
  { name: 'AWSFargateAdapter', create: () => new AWSFargateAdapter() },
  { name: 'GCPCloudRunAdapter', create: () => new GCPCloudRunAdapter() },
  {
    name: 'GCPCloudFunctionsAdapter',
    create: () => new GCPCloudFunctionsAdapter(),
  },
  {
    name: 'AzureFunctionsAdapter',
    create: () => new AzureFunctionsAdapter(),
  },
  {
    name: 'AzureContainerAppsAdapter',
    create: () => new AzureContainerAppsAdapter(),
  },
  {
    name: 'DigitalOceanAppPlatformAdapter',
    create: () => new DigitalOceanAppPlatformAdapter(),
  },
  { name: 'DockerAdapter', create: () => new DockerAdapter() },
];

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('Adapter E2E -- HTTP Server Integration', () => {
  let server: Server | null = null;

  afterEach(() => {
    if (server) {
      server.close();
      server = null;
    }
  });

  for (const { name, create } of adapters) {
    describe(name, () => {
      // ── Health check ──────────────────────────────────────────────
      it('boots a server and responds to health check', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const health = await fetchJSON(`${result.url}/health`);

        expect(health.status).toBe('ok');
        expect(health.adapter).toBe(adapter.name);
        expect(health.type).toBe(adapter.type);
        expect(health.diagnostics).toBeDefined();
        expect(health.diagnostics.adapter).toBe(adapter.name);

        adapter.clear();
      });

      // ── Cache basic operations ────────────────────────────────────
      it('handles cache set and get through HTTP', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/cache-test`);
        expect(data.cached).toBe('world');

        adapter.clear();
      });

      // ── Cache namespace isolation ─────────────────────────────────
      it('isolates cache namespaces', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/cache-isolation`);
        expect(data.ns1).toBe('value1');
        expect(data.ns2).toBe('value2');

        adapter.clear();
      });

      // ── Cache TTL ─────────────────────────────────────────────────
      it('supports cache TTL without immediate expiration', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/cache-ttl`);
        // Both should be readable immediately (TTL has not elapsed)
        expect(data.before).toBe('here-now');
        expect(data.durable).toBe('stays');

        adapter.clear();
      });

      // ── Cache increment / decrement ───────────────────────────────
      it('supports cache increment and decrement', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/cache-counter`);
        expect(data.a).toBe(1); // 0 + 1
        expect(data.b).toBe(2); // 1 + 1
        expect(data.c).toBe(7); // 2 + 5
        expect(data.d).toBe(5); // 7 - 2

        adapter.clear();
      });

      // ── Cache delete / exists ─────────────────────────────────────
      it('supports cache delete and exists', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/cache-delete`);
        expect(data.existsBefore).toBe(true);
        expect(data.existsAfter).toBe(false);
        expect(data.getAfter).toBeNull();

        adapter.clear();
      });

      // ── Queue send + consumer ─────────────────────────────────────
      it('handles queue send and consumer through HTTP', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/queue-test`);
        expect(data.sent).toBe(true);
        // In-memory queues invoke consumer synchronously
        expect(data.received).toEqual({ type: 'test', data: 'hello' });

        adapter.clear();
      });

      // ── Queue batch ───────────────────────────────────────────────
      it('handles queue batch send', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/queue-batch`);
        expect(data.count).toBe(3);
        expect(data.received).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

        adapter.clear();
      });

      // ── Integration: cache + queue ────────────────────────────────
      it('integrates cache and queue in single request', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/integration`);
        expect(data.fromQueue).toBe('integrated');
        expect(data.queueResult).toBe('integrated');

        adapter.clear();
      });

      // ── Diagnostics ───────────────────────────────────────────────
      it('exposes diagnostics and binding availability', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/diagnostics`);
        expect(data.diagnostics).toBeDefined();
        expect(data.diagnostics.adapter).toBe(adapter.name);
        // Without config, AI should not be available
        expect(data.hasAI).toBe(false);

        adapter.clear();
      });

      // ── waitUntil ─────────────────────────────────────────────────
      it('accepts background work via waitUntil', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const data = await fetchJSON(`${result.url}/wait-until`);
        expect(data.accepted).toBe(true);
        // The immediately-resolving promise completes synchronously
        expect(data.completed).toBe(true);

        adapter.clear();
      });

      // ── 404 handling ──────────────────────────────────────────────
      it('returns 404 for unknown paths', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const resp = await fetch(`${result.url}/nonexistent`);
        expect(resp.status).toBe(404);

        adapter.clear();
      });

      // ── Multiple sequential requests ──────────────────────────────
      it('handles multiple sequential requests on the same server', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        // Hit multiple endpoints in sequence
        const health = await fetchJSON(`${result.url}/health`);
        expect(health.status).toBe('ok');

        const cache = await fetchJSON(`${result.url}/cache-test`);
        expect(cache.cached).toBe('world');

        const queue = await fetchJSON(`${result.url}/queue-test`);
        expect(queue.sent).toBe(true);

        const diag = await fetchJSON(`${result.url}/diagnostics`);
        expect(diag.diagnostics.adapter).toBe(adapter.name);

        adapter.clear();
      });

      // ── Concurrent requests ───────────────────────────────────────
      it('handles concurrent requests', async () => {
        const adapter = create();
        await adapter.init({});
        const result = await startServer(adapter);
        server = result.server;

        const results = await Promise.all([
          fetchJSON(`${result.url}/health`),
          fetchJSON(`${result.url}/cache-test`),
          fetchJSON(`${result.url}/diagnostics`),
        ]);

        expect(results[0].status).toBe('ok');
        expect(results[1].cached).toBe('world');
        expect(results[2].diagnostics.adapter).toBe(adapter.name);

        adapter.clear();
      });

      // ── Adapter type classification ───────────────────────────────
      it('reports correct runtime type', async () => {
        const adapter = create();
        expect(['edge', 'serverless', 'container']).toContain(adapter.type);
      });

      // ── Clear resets state ────────────────────────────────────────
      it('clear() resets adapter state', async () => {
        const adapter = create();
        await adapter.init({});

        // Warm up the queue map
        adapter.getQueue('reset-test');
        const before = adapter.getLocalQueue('reset-test');
        expect(before).not.toBeNull();

        adapter.clear();

        // After clear, local queue should be gone
        const after = adapter.getLocalQueue('reset-test');
        expect(after).toBeNull();
      });
    });
  }
});
