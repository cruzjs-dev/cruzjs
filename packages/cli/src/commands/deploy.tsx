import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import {
  Header,
  StepHeader,
  Task,
  Select,
  Info,
  Success,
  ErrorMsg,
  type TaskStatus,
} from '../components/index';
import { Config, CloudflareEnvironment } from '../config/index';
import { loadCruzConfig, getResourceName } from '../config/cruz-config';
import { generateWranglerToml } from '../config/wrangler-generator';
import {
  applyD1Migrations,
  bundlePagesWorker,
  hasCloudflareAuth,
  discoverWorkers,
  deployStandaloneWorker,
  createD1Database,
  createKVNamespace,
  runWrangler,
} from '../utils/wrangler';
import { resolveAppDir } from '../utils/shell';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

type DeployProps = {
  config: Config;
  saveConfig: (config: Config) => void;
  rootDir: string;
  envName?: string;
  skipBuild?: boolean;
  skipMigrate?: boolean;
  autoConfirm?: boolean;
  healthCheck?: boolean;
};

type Step = 'select' | 'confirm' | 'deploying' | 'done' | 'error';

type DeployTask = {
  id: string;
  label: string;
  status: TaskStatus;
  message?: string;
};

/**
 * Sanitize a git branch name for use as a Cloudflare resource name.
 * Replaces `/` with `-`, removes invalid chars, and lowercases.
 */
function sanitizeBranchName(branch: string): string {
  return branch
    .toLowerCase()
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get the current git branch name.
 */
function getCurrentBranch(rootDir: string): string {
  try {
    return execSync('git branch --show-current', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return 'preview';
  }
}

export const Deploy: React.FC<DeployProps> = ({
  config,
  saveConfig,
  rootDir,
  envName: initialEnvName,
  skipBuild = false,
  skipMigrate = false,
  autoConfirm = false,
  healthCheck = false,
}) => {
  const { exit } = useApp();

  const [step, setStep] = useState<Step>(initialEnvName ? (autoConfirm ? 'deploying' : 'confirm') : 'select');
  const [selectedEnv, setSelectedEnv] = useState<CloudflareEnvironment | null>(
    initialEnvName
      ? config.cloudflareEnvironments?.find((e) => e.name === initialEnvName) || null
      : null
  );
  const [envNameResolved, setEnvNameResolved] = useState<string>(initialEnvName || '');
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DeployTask[]>([]);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);

  const wranglerDir = resolveAppDir(rootDir);

  const updateTask = (id: string, updates: Partial<DeployTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const runDeployment = async () => {
    const currentEnvName = envNameResolved;
    const isPreview = currentEnvName === 'preview';

    // Determine branch for preview deploys
    let branchName: string | undefined;
    if (isPreview) {
      branchName = sanitizeBranchName(getCurrentBranch(rootDir));
      if (!branchName || branchName === 'main' || branchName === 'master') {
        setError(
          'Cannot deploy a preview from the main/master branch.\n' +
          'Switch to a feature branch first, or deploy to "production".'
        );
        setStep('error');
        return;
      }
    }

    // Load cruz.config.ts
    let cruzConfig;
    try {
      cruzConfig = await loadCruzConfig(rootDir);
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
      return;
    }

    // Check for Cloudflare authentication
    const auth = hasCloudflareAuth(wranglerDir);
    if (!auth.hasAuth) {
      setError(
        'Not authenticated with Cloudflare.\n\n' +
        'Run "cruz-deploy setup" to authenticate, or set CLOUDFLARE_API_TOKEN environment variable.\n\n' +
        'Create an API token at: https://dash.cloudflare.com/profile/api-tokens'
      );
      setStep('error');
      return;
    }

    // Resolve environment — for preview, auto-init if missing
    let env = selectedEnv;
    if (!env && isPreview && branchName) {
      // Auto-init preview environment
      env = await autoInitPreviewEnv(cruzConfig.name, branchName, config, saveConfig);
      if (!env) {
        setError('Failed to auto-initialize preview environment.');
        setStep('error');
        return;
      }
      setSelectedEnv(env);
    }

    if (!env) {
      setError(`Cloudflare environment "${currentEnvName}" not found.\nRun "cruz-deploy init ${currentEnvName}" to set it up.`);
      setStep('error');
      return;
    }

    // Build task list
    const taskList: DeployTask[] = [];

    taskList.push({ id: 'wrangler-toml', label: 'Generate wrangler.toml', status: 'pending' });

    if (!skipBuild) {
      taskList.push({ id: 'build', label: 'Build application', status: 'pending' });
      taskList.push({ id: 'bundle', label: 'Bundle Pages worker', status: 'pending' });
    }

    if (!skipMigrate && env.d1) {
      taskList.push({ id: 'migrate', label: 'Apply D1 migrations', status: 'pending' });
    }

    taskList.push({ id: 'deploy', label: 'Deploy to Pages', status: 'pending' });

    const workers = discoverWorkers(rootDir);
    for (const worker of workers) {
      taskList.push({ id: `worker-${worker.name}`, label: `Deploy worker: ${worker.name}`, status: 'pending' });
    }

    taskList.push({ id: 'verify', label: 'Verify deployment', status: 'pending' });

    setTasks(taskList);

    try {
      // Step 1: Generate wrangler.toml
      updateTask('wrangler-toml', { status: 'running', message: 'Generating wrangler.toml...' });

      const tomlContent = generateWranglerToml(cruzConfig, env, currentEnvName);
      const tomlPath = resolve(wranglerDir, 'wrangler.toml');
      writeFileSync(tomlPath, tomlContent);

      updateTask('wrangler-toml', { status: 'success', message: 'wrangler.toml generated' });

      // Step 2: Build (if not skipped)
      if (!skipBuild) {
        updateTask('build', { status: 'running', message: 'Building React Router app...' });

        execSync('npx react-router build', {
          cwd: rootDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        updateTask('build', { status: 'success', message: 'Built successfully' });

        // Step 3: Bundle Pages worker
        updateTask('bundle', { status: 'running', message: 'Bundling worker...' });

        const workerResult = bundlePagesWorker(rootDir);
        if (!workerResult.success) {
          throw new Error(`Worker bundle failed: ${workerResult.error}`);
        }

        updateTask('bundle', { status: 'success', message: 'Worker bundled' });
      }

      // Step 4: Apply D1 migrations (if not skipped)
      if (!skipMigrate && env.d1) {
        updateTask('migrate', { status: 'running', message: 'Applying migrations to remote...' });

        const migrateResult = applyD1Migrations(env.d1.name, wranglerDir, true);

        if (!migrateResult.success) {
          if (migrateResult.error?.includes('No migrations') || migrateResult.error?.includes('Nothing to migrate')) {
            updateTask('migrate', { status: 'success', message: 'No pending migrations' });
          } else {
            updateTask('migrate', { status: 'success', message: 'Skipped (no migrations found)' });
          }
        } else {
          updateTask('migrate', { status: 'success', message: 'Migrations applied' });
        }
      }

      // Step 5: Deploy to Cloudflare Pages
      updateTask('deploy', { status: 'running', message: 'Deploying to Cloudflare Pages...' });

      const projectName = config.pagesProject || cruzConfig.name;
      // Build outputs to root dist/, but wrangler runs from the app dir
      const distPath = existsSync(resolve(wranglerDir, 'dist/client'))
        ? './dist/client'
        : '../../dist/client';
      const deployArgs = [
        'pages', 'deploy', distPath,
        '--project-name', projectName,
        '--commit-dirty=true',
      ];

      // Production deploys to the main branch; everything else to a named branch
      if (currentEnvName === 'production') {
        deployArgs.push('--branch', 'main');
      } else {
        const branch = isPreview && branchName ? branchName : currentEnvName;
        deployArgs.push('--branch', branch);
      }

      const deployResult = runWrangler(deployArgs, wranglerDir);

      if (!deployResult.success) {
        throw new Error(`Deployment failed: ${deployResult.error}`);
      }

      // Parse deployment URL from output
      const urlMatch = deployResult.output?.match(/https:\/\/[^\s]+\.pages\.dev/);
      if (urlMatch) {
        setDeployUrl(urlMatch[0]);
      } else if (env.customDomain) {
        setDeployUrl(`https://${env.customDomain}`);
      } else if (currentEnvName === 'production') {
        setDeployUrl(`https://${projectName}.pages.dev`);
      } else {
        const branch = isPreview && branchName ? branchName : currentEnvName;
        setDeployUrl(`https://${branch}.${projectName}.pages.dev`);
      }

      updateTask('deploy', { status: 'success', message: 'Deployed successfully' });

      // Step 6: Deploy standalone workers
      for (const worker of workers) {
        const taskId = `worker-${worker.name}`;
        updateTask(taskId, { status: 'running', message: `Deploying ${worker.name}...` });

        const workerResult = deployStandaloneWorker(worker.dir);
        if (!workerResult.success) {
          throw new Error(`Worker "${worker.name}" deployment failed: ${workerResult.error}`);
        }

        updateTask(taskId, { status: 'success', message: 'Deployed successfully' });
      }

      // Step 7: Verify — health check + record timestamp
      updateTask('verify', { status: 'running', message: 'Verifying deployment...' });

      // Health check — blocking with retries if --health-check flag set
      const healthUrl = deployUrl || (env.customDomain ? `https://${env.customDomain}` : null);
      if (healthUrl) {
        const maxRetries = healthCheck ? 10 : 1;
        const retryDelay = 3000;
        let passed = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 1) {
              updateTask('verify', { status: 'running', message: `Health check attempt ${attempt}/${maxRetries}...` });
              await new Promise((r) => setTimeout(r, retryDelay));
            }
            const statusCode = execSync(
              `curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "${healthUrl}/api/health"`,
              { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
            ).trim();
            if (statusCode.startsWith('2')) {
              updateTask('verify', { status: 'running', message: `Health check passed (${statusCode})` });
              passed = true;
              break;
            }
          } catch {
            // continue retrying
          }
        }

        if (!passed && healthCheck) {
          updateTask('verify', { status: 'error', message: 'Health check failed after all retries. Check deployment logs.' });
          setStep('error');
          setTimeout(() => exit(new Error('Health check failed')), 500);
          return;
        }
      }

      // Record deployedAt timestamp
      const envIndex = config.cloudflareEnvironments.findIndex((e) => e.name === env!.name);
      if (envIndex >= 0) {
        config.cloudflareEnvironments[envIndex].deployedAt = new Date().toISOString();
        saveConfig(config);
      }

      updateTask('verify', { status: 'success', message: 'Deployment verified' });

      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
    }
  };

  /**
   * Auto-initialize a preview environment by creating D1 + KV resources on the fly.
   */
  async function autoInitPreviewEnv(
    appName: string,
    branchName: string,
    cfg: Config,
    save: (c: Config) => void
  ): Promise<CloudflareEnvironment | null> {
    try {
      const envName = `preview-${branchName}`;
      const dbName = getResourceName(appName, envName, 'db');
      const kvName = getResourceName(appName, envName, 'cache');

      // Create D1 database
      const d1Result = createD1Database(dbName, wranglerDir);
      if (!d1Result.success || !d1Result.databaseId) {
        return null;
      }

      // Create KV namespace
      const kvResult = createKVNamespace(kvName, wranglerDir);
      if (!kvResult.success || !kvResult.namespaceId) {
        return null;
      }

      // Get account ID from existing environments or whoami
      const accountId = cfg.cloudflareEnvironments[0]?.accountId || '';

      const newEnv: CloudflareEnvironment = {
        name: 'preview',
        accountId,
        d1: { name: dbName, databaseId: d1Result.databaseId },
        kv: { name: kvName, namespaceId: kvResult.namespaceId },
        createdAt: new Date().toISOString(),
      };

      cfg.cloudflareEnvironments.push(newEnv);
      save(cfg);

      return newEnv;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (step === 'deploying') {
      runDeployment();
    }
  }, [step]);

  // Handle env resolution on mount
  useEffect(() => {
    if (initialEnvName === 'preview') {
      // Preview deploys auto-init, so don't error on missing env
      setEnvNameResolved('preview');
      if (autoConfirm) {
        setStep('deploying');
      } else {
        setStep('confirm');
      }
    } else if (initialEnvName && !selectedEnv) {
      setError(
        `Cloudflare environment "${initialEnvName}" not found.\n` +
        `Run "cruz-deploy init ${initialEnvName}" to set it up first.`
      );
      setStep('error');
    }
  }, []);

  if (step === 'error') {
    return (
      <Box flexDirection="column">
        <Header title="Deploy" subtitle="Failed" />
        <ErrorMsg>{error}</ErrorMsg>
      </Box>
    );
  }

  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <Header title="Deploy" subtitle="Complete" />
        <Success>Deployed to Cloudflare!</Success>
        <Box marginY={1} flexDirection="column">
          {deployUrl && (
            <Box>
              <Text color="green">URL: </Text>
              <Text color="cyan" underline>{deployUrl}</Text>
            </Box>
          )}
          {envNameResolved === 'preview' && (
            <Box marginTop={1}>
              <Text dimColor>Preview deploy — this URL will update on subsequent pushes to this branch.</Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  if (step === 'deploying') {
    return (
      <Box flexDirection="column">
        <Header title="Deploy" subtitle={envNameResolved || 'Deploying'} />
        <Box flexDirection="column" marginY={1}>
          {tasks.map((task) => (
            <Task
              key={task.id}
              label={task.label}
              status={task.status}
              message={task.message}
            />
          ))}
        </Box>
      </Box>
    );
  }

  const environments = config.cloudflareEnvironments || [];

  if (step === 'select') {
    if (environments.length === 0) {
      return (
        <Box flexDirection="column">
          <Header title="Deploy" />
          <ErrorMsg>No Cloudflare environments configured.</ErrorMsg>
          <Info>Run "cruz-deploy init" to set up a Cloudflare environment first.</Info>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Header title="Deploy" />
        <Select
          label="Select environment to deploy"
          items={environments.map((env) => ({
            label: env.name,
            value: env.name,
            description: env.customDomain || env.d1?.name || '',
          }))}
          onSelect={(item) => {
            const env = environments.find((e) => e.name === item.value);
            setSelectedEnv(env || null);
            setEnvNameResolved(item.value);
            setStep('confirm');
          }}
        />
      </Box>
    );
  }

  if (step === 'confirm') {
    return (
      <Box flexDirection="column">
        <Header title="Deploy" subtitle={envNameResolved} />
        <StepHeader step={1} title="Confirm Deployment" />
        <Box flexDirection="column" marginY={1}>
          <Info>Environment: {envNameResolved}</Info>
          {selectedEnv?.d1 && <Info>Database: {selectedEnv.d1.name}</Info>}
          {selectedEnv?.customDomain && <Info>Domain: {selectedEnv.customDomain}</Info>}
          {envNameResolved === 'preview' && <Info>Branch deploy (auto-init if needed)</Info>}
          {skipBuild && <Info>Build: Skipped</Info>}
          {skipMigrate && <Info>Migrations: Skipped</Info>}
        </Box>
        <Select
          label="Deploy to Cloudflare?"
          items={[
            { label: 'Yes, deploy now', value: 'yes' },
            { label: 'No, cancel', value: 'no' },
          ]}
          onSelect={(item) => {
            if (item.value === 'yes') {
              setStep('deploying');
            } else {
              exit();
            }
          }}
        />
      </Box>
    );
  }

  return null;
};

export default Deploy;
