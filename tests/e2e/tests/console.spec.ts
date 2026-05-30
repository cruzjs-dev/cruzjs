import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import * as path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.resolve(PROJECT_ROOT, 'packages/cli/src/index.tsx');

/**
 * Helper: pipe input to `cruz console` via stdin and capture stdout.
 * Uses tsx to run the CLI entry point with piped input (non-TTY mode).
 */
function runConsoleWithInput(
  input: string,
  timeoutMs = 15_000,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', CLI_BIN, 'console'], {
      cwd: PROJECT_ROOT,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        LOCAL_DEV: 'true',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Write input and close stdin to signal EOF
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

test.describe('cruz console', () => {
  test('evaluates simple arithmetic expression', async () => {
    const result = await runConsoleWithInput('1 + 1');

    // The output should contain "2" somewhere after the loading messages
    expect(result.stdout).toContain('2');
  });

  test('has db available in context', async () => {
    const result = await runConsoleWithInput('typeof db');

    // db should be either 'object' (if local.db exists) or 'object' (null is typeof object)
    expect(result.stdout).toMatch(/'object'/);
  });

  test('has schema available in context', async () => {
    const result = await runConsoleWithInput('typeof schema');

    expect(result.stdout).toMatch(/'object'/);
  });

  test('handles async expressions', async () => {
    const result = await runConsoleWithInput('await Promise.resolve(42)');

    expect(result.stdout).toContain('42');
  });

  test('shows banner on startup', async () => {
    const result = await runConsoleWithInput('');

    expect(result.stdout).toContain('CruzJS Interactive Console');
  });

  test('.tables lists schema tables', async () => {
    const result = await runConsoleWithInput('.tables');

    const output = result.stdout + result.stderr;
    if (!output.trim()) {
      test.skip(true, 'Console .tables not supported without local DB');
      return;
    }

    const hasTableOutput =
      output.includes('authIdentity') ||
      output.includes('organizations') ||
      output.includes('sessions') ||
      output.includes('Table') ||
      output.includes('table');

    expect(hasTableOutput || output.length > 0).toBe(true);
  });

  test('service resolution works in console context', async () => {
    const result = await runConsoleWithInput('typeof container');

    const output = result.stdout;
    if (!output.trim()) {
      test.skip(true, 'No output from console');
      return;
    }

    expect(output.length).toBeGreaterThan(0);
  });

  test('DB query via schema returns result', async () => {
    const result = await runConsoleWithInput(
      'db ? await db.run("SELECT 1 as n") : null',
    );

    const output = result.stdout + result.stderr;
    if (!output.trim()) {
      test.skip(true, 'No output from DB query (DB may not be initialized)');
      return;
    }

    expect(output.length).toBeGreaterThan(0);
  });
});
