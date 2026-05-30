/**
 * Dev server lifecycle commands: start (background), stop, restart, status.
 *
 * Process tracking strategy:
 *  - PID written to {rootDir}/.cruz/dev-server.pid on start
 *  - Vite binary invoked directly (no shell wrapper) so child.pid == the Vite process PID
 *  - CRUZ_DEV_SERVER=1 env var set on the child for additional identification
 *  - Log file at {rootDir}/.cruz/dev-server.log
 */

import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { spawn } from 'child_process';
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { resolve } from 'path';
import { resolveAppDir } from '../utils/shell';

// ── Helpers ────────────────────────────────────────────────────────────────

function cruzDir(rootDir: string) {
  return resolve(rootDir, '.cruz');
}

function pidFilePath(rootDir: string) {
  return resolve(rootDir, '.cruz', 'dev-server.pid');
}

function logFilePath(rootDir: string) {
  return resolve(rootDir, '.cruz', 'dev-server.log');
}

function ensureCruzDir(rootDir: string) {
  const dir = cruzDir(rootDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readPid(rootDir: string): number | null {
  const file = pidFilePath(rootDir);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, 'utf8').trim();
  const pid = parseInt(raw, 10);
  return isNaN(pid) ? null : pid;
}

function writePid(rootDir: string, pid: number) {
  writeFileSync(pidFilePath(rootDir), String(pid), 'utf8');
}

function removePid(rootDir: string) {
  const file = pidFilePath(rootDir);
  if (existsSync(file)) unlinkSync(file);
}

/** Returns true if a process with this PID is alive. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Gracefully terminate a PID (SIGTERM → wait 1 s → SIGKILL). */
function killPid(pid: number) {
  try {
    process.kill(pid, 'SIGTERM');
    const deadline = Date.now() + 1000;
    while (Date.now() < deadline && isAlive(pid)) {
      // busy-wait is fine here; this is a short CLI command
    }
    if (isAlive(pid)) process.kill(pid, 'SIGKILL');
  } catch {
    // process already gone
  }
}

// ── Foreground (non-ink) ────────────────────────────────────────────────────

/**
 * Run Vite in the foreground, streaming output directly to the terminal.
 * Called before ink renders so there's no conflict with ink's stdout usage.
 * Never returns — process exits when Vite exits.
 */
export function runForegroundDev(rootDir: string): void {
  const appDir = resolveAppDir(rootDir);
  const viteBin = existsSync(resolve(appDir, 'node_modules', '.bin', 'vp'))
    ? resolve(appDir, 'node_modules', '.bin', 'vp')
    : resolve(appDir, 'node_modules', '.bin', 'vite');

  if (!existsSync(viteBin)) {
    console.error('vite / vite-plus binary not found. Run: npm install');
    process.exit(1);
  }

  const viteArgs = viteBin.endsWith('/vp') ? ['dev', '--host'] : ['--host'];

  const child = spawn(viteBin, viteArgs, {
    cwd: appDir,
    shell: false,
    stdio: 'inherit',
    env: { ...process.env, CRUZ_DEV_SERVER: '1' },
  });

  const forward = (sig: NodeJS.Signals) => {
    try { child.kill(sig); } catch { /* already gone */ }
  };
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  child.on('close', (code) => process.exit(code ?? 0));
}

// ── Start ──────────────────────────────────────────────────────────────────

type DevServerProps = { rootDir: string };

export const DevStart: React.FC<DevServerProps> = ({ rootDir }) => {
  const { exit } = useApp();

  useEffect(() => {
    const existing = readPid(rootDir);
    if (existing && isAlive(existing)) {
      console.log(`Dev server is already running (PID: ${existing})`);
      console.log(`  Stop:   cruz dev stop`);
      console.log(`  Status: cruz dev status`);
      exit();
      return;
    }

    if (existing) removePid(rootDir);

    ensureCruzDir(rootDir);

    const log = logFilePath(rootDir);
    const logFd = openSync(log, 'a');

    const appDir = resolveAppDir(rootDir);
    const viteBin = existsSync(resolve(appDir, 'node_modules', '.bin', 'vp'))
      ? resolve(appDir, 'node_modules', '.bin', 'vp')
      : resolve(appDir, 'node_modules', '.bin', 'vite');
    const viteArgs = viteBin.endsWith('/vp') ? ['dev', '--host'] : ['--host'];
    if (!existsSync(viteBin)) {
      console.error(`vite / vite-plus binary not found. Run: npm install`);
      exit();
      return;
    }

    const child = spawn(viteBin, viteArgs, {
      cwd: resolveAppDir(rootDir),
      detached: true,
      shell: false,
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env, CRUZ_DEV_SERVER: '1' },
    });

    child.on('error', (err) => {
      console.error(`Failed to start dev server: ${err.message}`);
      removePid(rootDir);
    });

    writePid(rootDir, child.pid!);
    child.unref();

    console.log(`\x1b[32m✓\x1b[0m Dev server started`);
    console.log(`  PID:    ${child.pid}`);
    console.log(`  Log:    ${log}`);
    console.log(`  URL:    http://localhost:5000`);
    console.log(`  Stop:   cruz dev stop`);
    console.log(`  Tail:   tail -f ${log}`);
    exit();
  }, [rootDir, exit]);

  return null;
};

// ── Stop ───────────────────────────────────────────────────────────────────

export const DevStop: React.FC<DevServerProps> = ({ rootDir }) => {
  const { exit } = useApp();

  useEffect(() => {
    const pid = readPid(rootDir);

    if (!pid) {
      console.log('No dev server PID file found — nothing to stop.');
      exit();
      return;
    }

    if (!isAlive(pid)) {
      console.log(`Dev server is not running (stale PID: ${pid})`);
      removePid(rootDir);
      exit();
      return;
    }

    killPid(pid);
    removePid(rootDir);

    console.log(`\x1b[32m✓\x1b[0m Dev server stopped (PID: ${pid})`);
    exit();
  }, [rootDir, exit]);

  return null;
};

// ── Restart ────────────────────────────────────────────────────────────────

export const DevRestart: React.FC<DevServerProps> = ({ rootDir }) => {
  const { exit } = useApp();

  useEffect(() => {
    const pid = readPid(rootDir);
    if (pid && isAlive(pid)) {
      killPid(pid);
      removePid(rootDir);
      console.log(`\x1b[33m↺\x1b[0m  Stopped PID ${pid}`);
    }

    ensureCruzDir(rootDir);
    const log = logFilePath(rootDir);
    const logFd = openSync(log, 'a');

    const viteBin = resolve(resolveAppDir(rootDir), 'node_modules', '.bin', 'vp');
    if (!existsSync(viteBin)) {
      console.error(`vite-plus binary not found at: ${viteBin}`);
      exit();
      return;
    }

    const child = spawn(viteBin, ['dev', '--host'], {
      cwd: resolveAppDir(rootDir),
      detached: true,
      shell: false,
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env, CRUZ_DEV_SERVER: '1' },
    });

    child.on('error', (err) => {
      console.error(`Failed to start dev server: ${err.message}`);
      removePid(rootDir);
    });

    writePid(rootDir, child.pid!);
    child.unref();

    console.log(`\x1b[32m✓\x1b[0m Dev server restarted`);
    console.log(`  PID:  ${child.pid}`);
    console.log(`  Log:  ${log}`);
    console.log(`  URL:  http://localhost:5000`);
    exit();
  }, [rootDir, exit]);

  return null;
};

// ── Status ─────────────────────────────────────────────────────────────────

export const DevStatus: React.FC<DevServerProps> = ({ rootDir }) => {
  const { exit } = useApp();

  useEffect(() => {
    const pid = readPid(rootDir);

    if (!pid) {
      console.log('\x1b[90m●\x1b[0m Dev server: \x1b[31mnot running\x1b[0m');
      console.log(`  Start: cruz dev start`);
    } else if (isAlive(pid)) {
      console.log(`\x1b[32m●\x1b[0m Dev server: \x1b[32mrunning\x1b[0m`);
      console.log(`  PID:  ${pid}`);
      console.log(`  URL:  http://localhost:5000`);
      console.log(`  Log:  ${logFilePath(rootDir)}`);
      console.log(`  Stop: cruz dev stop`);
    } else {
      console.log('\x1b[90m●\x1b[0m Dev server: \x1b[31mnot running\x1b[0m (stale PID file)');
      removePid(rootDir);
      console.log(`  Start: cruz dev start`);
    }

    exit();
  }, [rootDir, exit]);

  return null;
};
