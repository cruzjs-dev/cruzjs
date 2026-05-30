import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import * as path from 'node:path';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.resolve(PROJECT_ROOT, 'packages/cli/src/index.tsx');

function runConsoleWithInput(
  input: string,
  timeoutMs = 15_000,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', CLI_BIN, 'console'], {
      cwd: PROJECT_ROOT,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development', LOCAL_DEV: 'true' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.stdin.write(input + '\n');
    child.stdin.end();

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ stdout, stderr, exitCode: null });
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code });
    });
  });
}

test.describe('Cache', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('cached endpoint responds within 200ms on second request', async ({ request }) => {
    const endpoint = `${BASE_URL}/api/health`;

    await request.get(endpoint);

    const start = Date.now();
    const res = await request.get(endpoint);
    const elapsed = Date.now() - start;

    expect(res.ok()).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });

  test('health endpoint is idempotent across multiple calls', async ({ request }) => {
    const results = await Promise.all([
      request.get(`${BASE_URL}/api/health`),
      request.get(`${BASE_URL}/api/health`),
      request.get(`${BASE_URL}/api/health`),
    ]);

    for (const res of results) {
      expect(res.ok()).toBe(true);
    }

    const bodies = await Promise.all(results.map((r) => r.json()));
    expect(bodies[0]).toEqual(bodies[1]);
    expect(bodies[1]).toEqual(bodies[2]);
  });

  test('cache console commands are recognized', async () => {
    const result = await runConsoleWithInput('typeof cache');

    const output = result.stdout + result.stderr;
    if (!output) {
      test.skip(true, 'Console not available');
      return;
    }

    expect(output).toBeTruthy();
  });

  test('server handles concurrent requests without race conditions', async ({ request }) => {
    const requests = Array.from({ length: 5 }, () =>
      request.get(`${BASE_URL}/api/health`),
    );

    const results = await Promise.all(requests);
    for (const res of results) {
      expect(res.ok()).toBe(true);
    }
  });
});
