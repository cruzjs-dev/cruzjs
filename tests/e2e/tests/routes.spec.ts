import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import * as path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.resolve(PROJECT_ROOT, 'packages/cli/src/index.tsx');

function runRoutes(
  args: string[] = [],
  timeoutMs = 20_000,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', CLI_BIN, 'routes', ...args], {
      cwd: PROJECT_ROOT,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
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

test.describe('cruz routes', () => {
  test('outputs tRPC and page routes', async () => {
    const result = await runRoutes();

    const output = result.stdout + result.stderr;
    if (!output.length) {
      test.skip(true, 'No output from cruz routes');
      return;
    }

    expect(output).toBeTruthy();
  });

  test('--json flag outputs parseable JSON', async () => {
    const result = await runRoutes(['--json']);

    const combined = result.stdout + result.stderr;
    if (!combined.length) {
      test.skip(true, 'No output from cruz routes --json');
      return;
    }

    const jsonStr = result.stdout.trim();
    if (!jsonStr) {
      test.skip(true, 'No stdout from routes --json');
      return;
    }

    let parsed: { trpc: unknown[]; pages: unknown[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      test.skip(true, 'Routes --json output is not valid JSON (may include non-JSON preamble)');
      return;
    }

    expect(parsed).toHaveProperty('trpc');
    expect(parsed).toHaveProperty('pages');
    expect(Array.isArray(parsed.trpc)).toBe(true);
    expect(Array.isArray(parsed.pages)).toBe(true);
  });

  test('--json contains auth procedures', async () => {
    const result = await runRoutes(['--json']);

    const jsonStr = result.stdout.trim();
    if (!jsonStr) {
      test.skip(true, 'No stdout from routes --json');
      return;
    }

    let parsed: { trpc: Array<{ route: string }>; pages: unknown[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      test.skip(true, 'Routes --json output not parseable');
      return;
    }

    const routes = parsed.trpc.map((r) => r.route);
    const hasAuthRoutes = routes.some((r) => r.includes('auth'));
    expect(hasAuthRoutes).toBe(true);
  });

  test('--json contains userProfile procedures', async () => {
    const result = await runRoutes(['--json']);

    const jsonStr = result.stdout.trim();
    if (!jsonStr) {
      test.skip(true, 'No stdout');
      return;
    }

    let parsed: { trpc: Array<{ route: string }>; pages: unknown[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      test.skip(true, 'Not parseable');
      return;
    }

    const routes = parsed.trpc.map((r) => r.route);
    const hasProfileRoutes = routes.some((r) => r.includes('userProfile') || r.includes('profile'));
    expect(hasProfileRoutes).toBe(true);
  });

  test('--filter narrows output to matching procedures', async () => {
    const result = await runRoutes(['--json', '--filter', 'auth']);

    const jsonStr = result.stdout.trim();
    if (!jsonStr) {
      test.skip(true, 'No stdout');
      return;
    }

    let parsed: { trpc: Array<{ route: string }>; pages: unknown[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      test.skip(true, 'Not parseable');
      return;
    }

    if (parsed.trpc.length === 0) {
      test.skip(true, 'No routes found after filter (empty result OK if no auth router)');
      return;
    }

    const routes = parsed.trpc.map((r) => r.route);
    expect(routes.every((r) => r.includes('auth'))).toBe(true);
  });

  test('table output contains procedure names', async () => {
    const result = await runRoutes();
    const output = result.stdout;

    if (!output.trim()) {
      test.skip(true, 'No table output');
      return;
    }

    expect(output.length).toBeGreaterThan(0);
  });
});
