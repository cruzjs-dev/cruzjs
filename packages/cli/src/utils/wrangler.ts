/**
 * Wrangler CLI Wrapper Utilities
 *
 * Provides wrapper functions for common wrangler commands.
 */

import { execSync, spawnSync } from 'child_process';
import * as fsModule from 'fs';
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

export type WranglerResult = {
  success: boolean;
  output?: string;
  error?: string;
};

/**
 * Execute a wrangler command and return the result
 */
export function runWrangler(args: string[], cwd: string): WranglerResult {
  try {
    const output = execSync(`npx wrangler ${args.join(' ')}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (err) {
    const error = err as { stderr?: string; message?: string };
    return {
      success: false,
      error: error.stderr || error.message || 'Unknown error',
    };
  }
}

/**
 * Execute a wrangler command interactively (with stdio inherited)
 */
export function runWranglerInteractive(args: string[], cwd: string): boolean {
  const result = spawnSync('npx', ['wrangler', ...args], {
    cwd,
    stdio: 'inherit',
    shell: true,
  });
  return result.status === 0;
}

/**
 * Check if wrangler is installed
 */
export function isWranglerInstalled(): boolean {
  try {
    execSync('npx wrangler --version', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if wrangler is logged in
 */
export function isWranglerLoggedIn(cwd: string): boolean {
  const result = runWrangler(['whoami'], cwd);

  // Check various indicators of being logged in
  if (!result.success) return false;

  const output = result.output?.toLowerCase() || '';

  // Not logged in indicators
  if (output.includes('not logged in') || output.includes('not authenticated')) {
    return false;
  }

  // Logged in indicators - look for account info
  if (output.includes('account') || output.includes('@') || output.includes('token')) {
    return true;
  }

  // If command succeeded and no "not logged in" message, assume logged in
  return result.success;
}

/**
 * Login to wrangler interactively
 */
export function wranglerLogin(cwd: string): WranglerResult {
  try {
    const result = spawnSync('npx', ['wrangler', 'login'], {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    return {
      success: result.status === 0,
      error: result.status !== 0 ? `Exit code: ${result.status}` : undefined,
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Login to wrangler and capture output for debugging
 */
export function wranglerLoginWithOutput(cwd: string): WranglerResult {
  try {
    const output = execSync('npx wrangler login 2>&1', {
      cwd,
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 120000, // 2 minute timeout
    });

    return { success: true, output };
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    return {
      success: false,
      output: error.stdout,
      error: error.stderr || error.message,
    };
  }
}

/**
 * Get Cloudflare account ID
 */
export function getAccountId(cwd: string): string | null {
  const result = runWrangler(['whoami'], cwd);
  if (!result.success) return null;

  const output = result.output || '';

  // Try various patterns to find account ID
  // Pattern 1: "Account ID: abc123..."
  let match = output.match(/Account ID[:\s]+([a-f0-9]+)/i);
  if (match) return match[1];

  // Pattern 2: Look for a 32-character hex string (typical account ID length)
  match = output.match(/\b([a-f0-9]{32})\b/i);
  if (match) return match[1];

  // Pattern 3: Any hex string that looks like an ID
  match = output.match(/\b([a-f0-9]{16,})\b/i);
  if (match) return match[1];

  return null;
}

// D1 Database Operations

export type D1Database = {
  uuid: string;
  name: string;
  created_at: string;
};

/**
 * Create a new D1 database
 */
export function createD1Database(name: string, cwd: string): WranglerResult & { databaseId?: string } {
  const result = runWrangler(['d1', 'create', name], cwd);
  if (result.success && result.output) {
    // Try to parse database ID from text output
    // Look for patterns like: database_id = "xxx" or uuid: xxx or Created database xxx with id: xxx
    let match = result.output.match(/database_id\s*=\s*"?([a-f0-9-]+)"?/i);
    if (match) return { ...result, databaseId: match[1] };

    match = result.output.match(/uuid[:\s]+([a-f0-9-]+)/i);
    if (match) return { ...result, databaseId: match[1] };

    match = result.output.match(/id[:\s]+([a-f0-9-]+)/i);
    if (match) return { ...result, databaseId: match[1] };

    // Look for any UUID-like string
    match = result.output.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (match) return { ...result, databaseId: match[1] };
  }
  return result;
}

/**
 * List D1 databases
 */
export function listD1Databases(cwd: string): D1Database[] {
  const result = runWrangler(['d1', 'list'], cwd);
  if (result.success && result.output) {
    // Try JSON first
    try {
      return JSON.parse(result.output);
    } catch {
      // Parse text output - look for database entries
      const databases: D1Database[] = [];
      const lines = result.output.split('\n');
      for (const line of lines) {
        // Look for UUID patterns with names
        const match = line.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s+(\S+)/i);
        if (match) {
          databases.push({ uuid: match[1], name: match[2], created_at: '' });
        }
      }
      return databases;
    }
  }
  return [];
}

/**
 * Apply D1 migrations
 */
export function applyD1Migrations(
  databaseName: string,
  cwd: string,
  remote: boolean = false
): WranglerResult {
  const target = remote ? '--remote' : '--local';
  return runWrangler(['d1', 'migrations', 'apply', databaseName, target], cwd);
}

// R2 Bucket Operations

export type R2Bucket = {
  name: string;
  creation_date: string;
};

/**
 * Create a new R2 bucket
 */
export function createR2Bucket(name: string, cwd: string): WranglerResult {
  return runWrangler(['r2', 'bucket', 'create', name], cwd);
}

/**
 * List R2 buckets
 */
export function listR2Buckets(cwd: string): R2Bucket[] {
  const result = runWrangler(['r2', 'bucket', 'list'], cwd);
  if (result.success && result.output) {
    // Try JSON first
    try {
      return JSON.parse(result.output);
    } catch {
      // Parse text output - look for bucket names
      const buckets: R2Bucket[] = [];
      const lines = result.output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('-') && !trimmed.toLowerCase().includes('bucket')) {
          buckets.push({ name: trimmed, creation_date: '' });
        }
      }
      return buckets;
    }
  }
  return [];
}

// KV Namespace Operations

export type KVNamespace = {
  id: string;
  title: string;
};

/**
 * Create a new KV namespace
 */
export function createKVNamespace(title: string, cwd: string): WranglerResult & { namespaceId?: string } {
  const result = runWrangler(['kv', 'namespace', 'create', title], cwd);
  if (result.success && result.output) {
    // Try to parse namespace ID from text output
    // Look for patterns like: id = "xxx" or id: xxx
    let match = result.output.match(/id\s*=\s*"?([a-f0-9]+)"?/i);
    if (match) return { ...result, namespaceId: match[1] };

    match = result.output.match(/namespace_id[:\s]+([a-f0-9]+)/i);
    if (match) return { ...result, namespaceId: match[1] };

    // Look for any 32-char hex string (typical KV namespace ID)
    match = result.output.match(/\b([a-f0-9]{32})\b/i);
    if (match) return { ...result, namespaceId: match[1] };
  }
  return result;
}

/**
 * List KV namespaces
 */
export function listKVNamespaces(cwd: string): KVNamespace[] {
  const result = runWrangler(['kv', 'namespace', 'list'], cwd);
  if (result.success && result.output) {
    // Try JSON first
    try {
      return JSON.parse(result.output);
    } catch {
      // Parse text output
      const namespaces: KVNamespace[] = [];
      const lines = result.output.split('\n');
      for (const line of lines) {
        // Look for ID and title patterns
        const match = line.match(/([a-f0-9]{32})\s+(\S+)/i);
        if (match) {
          namespaces.push({ id: match[1], title: match[2] });
        }
      }
      return namespaces;
    }
  }
  return [];
}

// Secrets Operations

/**
 * Set a secret
 */
export function setSecret(name: string, value: string, cwd: string, env?: string): WranglerResult {
  const args = ['secret', 'put', name];
  if (env) args.push('--env', env);

  try {
    // Use echo to pipe the value to stdin
    execSync(`echo "${value}" | npx wrangler ${args.join(' ')}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true };
  } catch (err) {
    const error = err as { stderr?: string; message?: string };
    return { success: false, error: error.stderr || error.message };
  }
}

/**
 * List secrets
 */
export function listSecrets(cwd: string, env?: string): string[] {
  const args = ['secret', 'list'];
  if (env) args.push('--env', env);

  const result = runWrangler(args, cwd);
  if (result.success && result.output) {
    // Try JSON first
    try {
      const secrets = JSON.parse(result.output);
      return secrets.map((s: { name: string }) => s.name);
    } catch {
      // Parse text output - look for secret names
      const secrets: string[] = [];
      const lines = result.output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Look for lines that look like secret names (UPPER_CASE)
        if (trimmed && /^[A-Z_][A-Z0-9_]*$/.test(trimmed)) {
          secrets.push(trimmed);
        }
      }
      return secrets;
    }
  }
  return [];
}

// Pages Worker Bundle

/**
 * After react-router build, copy server bundle into dist/client and generate _worker.js.
 * Without this step, Cloudflare Pages has no SSR handler and returns 404 for every request.
 */
export function bundlePagesWorker(rootDir: string): WranglerResult {
  const { copyFileSync, existsSync: fsExists, readdirSync: fsReaddirSync, writeFileSync } = fsModule;
  const fsResolve = resolve;

  const WORKER_JS = `import { createRequestHandler } from "@react-router/cloudflare";
import * as serverBuild from "./_server.js";

const requestHandler = createRequestHandler({ build: serverBuild, mode: "production" });

export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method === "GET" && env.ASSETS) {
        try {
          const assetResponse = await env.ASSETS.fetch(request.url, { headers: request.headers });
          if (assetResponse.status >= 200 && assetResponse.status < 400) return assetResponse;
        } catch {}
      }
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx), passThroughOnException: ctx.passThroughOnException?.bind(ctx) || (() => {}) };
      return await requestHandler(context);
    } catch (error) {
      console.error("[Worker] Error:", error.message || error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};`;

  const distClient = fsResolve(rootDir, 'dist/client');
  const distServer = fsResolve(rootDir, 'dist/server');

  if (!fsExists(distClient)) return { success: false, error: 'dist/client not found' };
  if (!fsExists(fsResolve(distServer, 'index.js'))) return { success: false, error: 'dist/server/index.js not found' };

  copyFileSync(fsResolve(distServer, 'index.js'), fsResolve(distClient, '_server.js'));

  const serverAssetsDir = fsResolve(distServer, 'assets');
  if (fsExists(serverAssetsDir)) {
    for (const file of readdirSync(serverAssetsDir)) {
      copyFileSync(fsResolve(serverAssetsDir, file), fsResolve(distClient, 'assets', file));
    }
  }

  writeFileSync(fsResolve(distClient, '_worker.js'), WORKER_JS);
  return { success: true };
}

// Deploy Operations

/**
 * Check if Cloudflare authentication is available
 * Returns true if either:
 * - CLOUDFLARE_API_TOKEN is set (for non-interactive environments)
 * - User is logged in via wrangler login (for interactive environments)
 */
export function hasCloudflareAuth(cwd: string): { hasAuth: boolean; method: 'token' | 'oauth' | 'none' } {
  // Check for API token first (works in all environments)
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return { hasAuth: true, method: 'token' };
  }

  // Check for OAuth login
  if (isWranglerLoggedIn(cwd)) {
    return { hasAuth: true, method: 'oauth' };
  }

  return { hasAuth: false, method: 'none' };
}

/**
 * Deploy to Cloudflare Pages
 * Uses wrangler pages deploy for SSR apps
 * Note: nodejs_compat must be set in Cloudflare Dashboard > Pages > Settings > Functions
 */
export function deployWorker(cwd: string, env?: string): WranglerResult {
  const infraName = process.env.INFRASTRUCTURE_NAME || 'cruzjs';
  const args = [
    'pages', 'deploy', '../../dist/client',
    '--project-name', infraName,
    '--commit-dirty=true',
  ];
  if (env && env !== 'production') {
    args.push('--branch', env);
  }

  // If we have API token or are in interactive mode, use the appropriate method
  const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

  if (isInteractive && !process.env.CLOUDFLARE_API_TOKEN) {
    // Use interactive mode for OAuth
    const success = runWranglerInteractive(args, cwd);
    return { success, error: success ? undefined : 'Deployment failed' };
  }

  // Non-interactive mode (requires CLOUDFLARE_API_TOKEN)
  return runWrangler(args, cwd);
}

/**
 * Get deployment info
 */
export function getDeployments(cwd: string): WranglerResult {
  return runWrangler(['deployments', 'list'], cwd);
}

// Domain Operations

/**
 * Add a custom domain
 */
export function addCustomDomain(domain: string, cwd: string, env?: string): WranglerResult {
  const args = ['domains', 'add', domain];
  if (env) args.push('--env', env);
  return runWrangler(args, cwd);
}

/**
 * List custom domains
 */
export function listCustomDomains(cwd: string, env?: string): WranglerResult {
  const args = ['domains', 'list'];
  if (env) args.push('--env', env);
  return runWrangler(args, cwd);
}

// Queue Operations

export type Queue = {
  queue_id: string;
  queue_name: string;
  created_on: string;
};

/**
 * Create a new Queue
 */
export function createQueue(name: string, cwd: string): WranglerResult & { queueId?: string } {
  const result = runWrangler(['queues', 'create', name], cwd);
  if (result.success && result.output) {
    // Try to parse queue ID from text output
    // Look for patterns like: queue_id = "xxx" or id: xxx
    let match = result.output.match(/queue_id[:\s=]+"?([a-f0-9-]+)"?/i);
    if (match) return { ...result, queueId: match[1] };

    match = result.output.match(/id[:\s=]+"?([a-f0-9-]+)"?/i);
    if (match) return { ...result, queueId: match[1] };

    // Look for any UUID-like string
    match = result.output.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (match) return { ...result, queueId: match[1] };
  }
  return result;
}

/**
 * List queues
 */
export function listQueues(cwd: string): Queue[] {
  const result = runWrangler(['queues', 'list'], cwd);
  if (result.success && result.output) {
    // Try JSON first
    try {
      return JSON.parse(result.output);
    } catch {
      // Parse text output - look for queue entries
      const queues: Queue[] = [];
      const lines = result.output.split('\n');
      for (const line of lines) {
        // Look for queue name patterns
        const match = line.match(/([a-f0-9-]{36})\s+(\S+)/i);
        if (match) {
          queues.push({ queue_id: match[1], queue_name: match[2], created_on: '' });
        }
      }
      return queues;
    }
  }
  return [];
}

/**
 * Delete a queue
 */
export function deleteQueue(name: string, cwd: string): WranglerResult {
  return runWrangler(['queues', 'delete', name], cwd);
}

// Workflow Operations

/**
 * List workflows
 */
export function listWorkflows(cwd: string): WranglerResult {
  return runWrangler(['workflows', 'list'], cwd);
}

/**
 * Trigger a workflow
 */
export function triggerWorkflow(name: string, params: object, cwd: string): WranglerResult {
  return runWrangler(['workflows', 'trigger', name, '--params', JSON.stringify(params)], cwd);
}

/**
 * List workflow instances
 */
export function listWorkflowInstances(name: string, cwd: string): WranglerResult {
  return runWrangler(['workflows', 'instances', 'list', name], cwd);
}

/**
 * Discover standalone workers in external-processes/
 * Scans for subdirectories containing a wrangler.toml
 */
export function discoverWorkers(rootDir: string): { name: string; dir: string }[] {
  const workersDir = resolve(rootDir, 'external-processes');
  if (!existsSync(workersDir)) return [];

  return readdirSync(workersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      dir: resolve(workersDir, entry.name),
    }))
    .filter((worker) => existsSync(resolve(worker.dir, 'wrangler.toml')));
}

/**
 * Deploy a standalone worker from its own directory
 * Runs npm install then wrangler deploy
 */
export function deployStandaloneWorker(workerDir: string): WranglerResult {
  try {
    // Install dependencies
    execSync('npm install', {
      cwd: workerDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Deploy - strip CLOUDFLARE_API_TOKEN so wrangler uses OAuth for container registry
    const { CLOUDFLARE_API_TOKEN: _, ...envWithoutToken } = process.env;
    const output = execSync('npx wrangler deploy', {
      cwd: workerDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: envWithoutToken as NodeJS.ProcessEnv,
    });

    return { success: true, output };
  } catch (err) {
    const error = err as { stderr?: string; message?: string };
    return {
      success: false,
      error: error.stderr || error.message || 'Unknown error',
    };
  }
}
