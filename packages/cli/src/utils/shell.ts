import { spawn, SpawnOptions } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

export type ShellResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type ShellOptions = {
  cwd?: string;
  env?: Record<string, string>;
  silent?: boolean;
};

// Run a command and capture output
export const runCommand = (
  command: string,
  args: string[],
  options: ShellOptions = {}
): Promise<ShellResult> => {
  return new Promise((resolve) => {
    const { cwd, env, silent } = options;

    const spawnOptions: SpawnOptions = {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      stdio: silent ? 'pipe' : 'inherit',
    };

    const child = spawn(command, args, spawnOptions);
    let stdout = '';
    let stderr = '';

    if (silent && child.stdout && child.stderr) {
      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });
    }

    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });

    child.on('error', (err) => {
      resolve({ code: 1, stdout, stderr: err.message });
    });
  });
};

// Run a command with streaming output (for dev servers, etc)
export const runStreamingCommand = (
  command: string,
  args: string[],
  options: ShellOptions = {}
): Promise<number> => {
  return new Promise((resolve) => {
    const { cwd, env } = options;

    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      stdio: 'inherit',
    });

    child.on('close', (code) => resolve(code ?? 0));
    child.on('error', () => resolve(1));
  });
};

// Check if an env file exists
export const envFileExists = (rootDir: string, envName?: string): boolean => {
  const envFileName = envName ? `.env.${envName}` : '.env';
  const envPath = resolve(rootDir, envFileName);
  return existsSync(envPath);
};

/**
 * Resolve the app directory.
 * Monorepo: the first apps/<name> that contains a cruz.config.ts.
 * Falls back to legacy apps/web, then standalone rootDir.
 */
export const resolveAppDir = (rootDir: string): string => {
  const appsDir = resolve(rootDir, 'apps');
  if (existsSync(appsDir)) {
    const match = readdirSync(appsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => resolve(appsDir, e.name))
      .find((dir) => existsSync(resolve(dir, 'cruz.config.ts')));
    if (match) {
      return match;
    }
  }
  const webDir = resolve(rootDir, 'apps/web');
  return existsSync(webDir) ? webDir : rootDir;
};
