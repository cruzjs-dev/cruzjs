import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import {
  Header,
  StepHeader,
  Task,
  Input,
  Select,
  Info,
  Success,
  ErrorMsg,
  type TaskStatus,
} from '../components/index';
import {
  Config,
  CloudflareEnvironment,
} from '../config/index';
import { loadCruzConfig, getResourceName } from '../config/cruz-config';
import { generateWranglerToml } from '../config/wrangler-generator';
import {
  isWranglerLoggedIn,
  wranglerLogin,
  getAccountId,
  createD1Database,
  createR2Bucket,
  createKVNamespace,
  runWrangler,
} from '../utils/wrangler';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { resolveAppDir } from '../utils/shell';
import type { CruzConfig } from '../define-config';

type InitProps = {
  config: Config;
  saveConfig: (config: Config) => void;
  rootDir: string;
  envName?: string;
  accountId?: string;
  autoConfirm?: boolean;
};

type Step =
  | 'name'
  | 'login'
  | 'account'
  | 'resources'
  | 'creating'
  | 'done'
  | 'error';

type DeployTask = {
  id: string;
  label: string;
  status: TaskStatus;
  message?: string;
};

export const Init: React.FC<InitProps> = ({
  config,
  saveConfig,
  rootDir,
  envName: initialName,
  accountId: flagAccountId,
  autoConfirm = false,
}) => {
  const { exit } = useApp();

  const [step, setStep] = useState<Step>(initialName ? 'login' : (autoConfirm ? 'login' : 'name'));
  const [envName, setEnvName] = useState(initialName || '');
  const [accountId, setAccountId] = useState<string | null>(flagAccountId || null);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DeployTask[]>([]);
  const [createdEnv, setCreatedEnv] = useState<CloudflareEnvironment | null>(null);
  const [cruzConfig, setCruzConfig] = useState<CruzConfig | null>(null);

  const updateTask = (id: string, updates: Partial<DeployTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const getWranglerDir = () => {
    return resolveAppDir(rootDir);
  };

  const createResources = async () => {
    const wranglerDir = getWranglerDir();

    let loadedConfig: CruzConfig;
    try {
      loadedConfig = cruzConfig || (await loadCruzConfig(rootDir));
      setCruzConfig(loadedConfig);
    } catch (err) {
      setError(`Failed to load cruz.config.ts: ${(err as Error).message}`);
      setStep('error');
      return;
    }

    const appName = loadedConfig.name;
    const bindings = loadedConfig.bindings ?? {};

    // Build task list based on enabled bindings
    const taskList: DeployTask[] = [];

    // Pages project is always created
    if (!config.pagesProject) {
      taskList.push({ id: 'pages', label: 'Create Pages project', status: 'pending' });
    }

    if (bindings.d1) {
      taskList.push({ id: 'd1', label: 'Create D1 database', status: 'pending' });
    }
    if (bindings.kv) {
      taskList.push({ id: 'kv', label: 'Create KV namespace', status: 'pending' });
    }
    if (bindings.r2) {
      taskList.push({ id: 'r2', label: 'Create R2 bucket', status: 'pending' });
    }

    taskList.push({ id: 'wrangler', label: 'Generate wrangler.toml', status: 'pending' });
    setTasks(taskList);

    try {
      const newEnv: CloudflareEnvironment = {
        name: envName,
        accountId: accountId!,
        createdAt: new Date().toISOString(),
      };

      // Step: Create Pages project if needed
      if (!config.pagesProject) {
        updateTask('pages', { status: 'running' });
        const pagesResult = runWrangler(
          ['pages', 'project', 'create', appName, '--production-branch', 'main'],
          wranglerDir
        );

        if (!pagesResult.success) {
          if (pagesResult.error?.includes('already exists')) {
            updateTask('pages', { status: 'success', message: 'Already exists' });
          } else {
            throw new Error(`Failed to create Pages project: ${pagesResult.error}`);
          }
        } else {
          updateTask('pages', { status: 'success', message: 'Created' });
        }

        config.pagesProject = appName;
      }

      // Step: Create D1 database
      if (bindings.d1) {
        updateTask('d1', { status: 'running' });
        const d1Name = getResourceName(appName, envName, 'db');

        // Check if env already has d1 info (idempotent)
        const existingEnv = config.cloudflareEnvironments.find((e) => e.name === envName);
        if (existingEnv?.d1) {
          updateTask('d1', { status: 'success', message: `Already exists: ${existingEnv.d1.databaseId}` });
          newEnv.d1 = existingEnv.d1;
        } else {
          const d1Result = createD1Database(d1Name, wranglerDir);

          if (!d1Result.success) {
            if (d1Result.error?.includes('already exists')) {
              updateTask('d1', { status: 'success', message: 'Already exists' });
              newEnv.d1 = { name: d1Name, databaseId: '' };
            } else {
              throw new Error(`Failed to create D1 database: ${d1Result.error}`);
            }
          } else {
            updateTask('d1', { status: 'success', message: `ID: ${d1Result.databaseId}` });
            newEnv.d1 = { name: d1Name, databaseId: d1Result.databaseId || '' };
          }
        }
      }

      // Step: Create KV namespace
      if (bindings.kv) {
        updateTask('kv', { status: 'running' });
        const kvName = getResourceName(appName, envName, 'cache');

        const existingEnv = config.cloudflareEnvironments.find((e) => e.name === envName);
        if (existingEnv?.kv) {
          updateTask('kv', { status: 'success', message: `Already exists: ${existingEnv.kv.namespaceId}` });
          newEnv.kv = existingEnv.kv;
        } else {
          const kvResult = createKVNamespace(kvName, wranglerDir);

          if (!kvResult.success) {
            if (kvResult.error?.includes('already exists')) {
              updateTask('kv', { status: 'success', message: 'Already exists' });
              newEnv.kv = { name: kvName, namespaceId: '' };
            } else {
              throw new Error(`Failed to create KV namespace: ${kvResult.error}`);
            }
          } else {
            updateTask('kv', { status: 'success', message: `ID: ${kvResult.namespaceId}` });
            newEnv.kv = { name: kvName, namespaceId: kvResult.namespaceId || '' };
          }
        }
      }

      // Step: Create R2 bucket
      if (bindings.r2) {
        updateTask('r2', { status: 'running' });
        const r2Name = getResourceName(appName, envName, 'storage');

        const existingEnv = config.cloudflareEnvironments.find((e) => e.name === envName);
        if (existingEnv?.r2) {
          updateTask('r2', { status: 'success', message: 'Already exists' });
          newEnv.r2 = existingEnv.r2;
        } else {
          const r2Result = createR2Bucket(r2Name, wranglerDir);

          if (!r2Result.success) {
            if (r2Result.error?.includes('already exists')) {
              updateTask('r2', { status: 'success', message: 'Already exists' });
            } else {
              throw new Error(`Failed to create R2 bucket: ${r2Result.error}`);
            }
          } else {
            updateTask('r2', { status: 'success', message: 'Created' });
          }

          newEnv.r2 = { name: r2Name };
        }
      }

      // Step: Generate wrangler.toml
      updateTask('wrangler', { status: 'running' });
      const wranglerPath = resolve(wranglerDir, 'wrangler.toml');
      const wranglerContent = generateWranglerToml(loadedConfig, newEnv, envName);
      writeFileSync(wranglerPath, wranglerContent);
      updateTask('wrangler', { status: 'success', message: 'Generated' });

      // Save environment to config (replace if exists, otherwise add)
      const existingIdx = config.cloudflareEnvironments.findIndex((e) => e.name === envName);
      if (existingIdx >= 0) {
        config.cloudflareEnvironments[existingIdx] = newEnv;
      } else {
        config.cloudflareEnvironments.push(newEnv);
      }
      saveConfig(config);
      setCreatedEnv(newEnv);

      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
    }
  };

  // Load cruz config on mount for display in resources step
  useEffect(() => {
    loadCruzConfig(rootDir)
      .then((cfg) => setCruzConfig(cfg))
      .catch(() => {
        // Will be caught again during createResources
      });
  }, [rootDir]);

  useEffect(() => {
    if (step === 'login') {
      // If account ID was provided via flag, skip auth check for account
      const wranglerDir = getWranglerDir();

      if (isWranglerLoggedIn(wranglerDir)) {
        if (!accountId) {
          const id = getAccountId(wranglerDir);
          if (id) {
            setAccountId(id);
            setStep(autoConfirm ? 'creating' : 'resources');
          } else {
            setStep('account');
          }
        } else {
          setStep(autoConfirm ? 'creating' : 'resources');
        }
      } else {
        console.log('\x1b[36m●\x1b[0m Opening browser for Cloudflare login...\n');
        const result = wranglerLogin(wranglerDir);
        if (result.success) {
          if (!accountId) {
            const id = getAccountId(wranglerDir);
            setAccountId(id);
          }
          setStep(autoConfirm ? 'creating' : 'resources');
        } else {
          setError('Failed to authenticate with Cloudflare');
          setStep('error');
        }
      }
    }
  }, [step, rootDir]);

  useEffect(() => {
    if (step === 'creating') {
      createResources();
    }
  }, [step]);

  if (step === 'error') {
    return (
      <Box flexDirection="column">
        <Header title="Init" subtitle="Failed" />
        <ErrorMsg>{error}</ErrorMsg>
      </Box>
    );
  }

  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <Header title="Init" subtitle="Complete" />
        <Success>Environment "{envName}" created!</Success>
        <Box marginY={1} flexDirection="column">
          <Info>Pages Project: {config.pagesProject}</Info>
          {createdEnv?.d1 && <Info>D1 Database: {createdEnv.d1.name} ({createdEnv.d1.databaseId})</Info>}
          {createdEnv?.kv && <Info>KV Namespace: {createdEnv.kv.name} ({createdEnv.kv.namespaceId})</Info>}
          {createdEnv?.r2 && <Info>R2 Bucket: {createdEnv.r2.name}</Info>}
        </Box>
        <Box marginTop={1}>
          <Text color="yellow" bold>Next steps:</Text>
        </Box>
        <Box flexDirection="column" marginLeft={2}>
          <Text>1. Review wrangler.toml configuration</Text>
          <Text>2. Run: cruz-deploy db migrate --local (to test locally)</Text>
          <Text>3. Run: cruz-deploy deploy {envName}</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'creating') {
    return (
      <Box flexDirection="column">
        <Header title="Init" subtitle={envName} />
        <StepHeader step={3} title="Creating Cloudflare Resources" />
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

  const appName = cruzConfig?.name || '...';
  const bindings = cruzConfig?.bindings ?? {};

  return (
    <Box flexDirection="column">
      <Header title="Init" subtitle="Cloudflare Environment Setup" />

      {step === 'name' && (
        <Box flexDirection="column">
          <StepHeader step={1} totalSteps={3} title="Environment Name" />
          <Input
            label="Enter a name for this environment"
            placeholder="e.g., staging, production"
            onSubmit={(value) => {
              setEnvName(value);
              setStep('login');
            }}
            validate={(value) => {
              if (!value.trim()) return 'Name is required';
              if (!/^[a-z0-9-]+$/.test(value))
                return 'Name must be lowercase alphanumeric with dashes';
              if (config.cloudflareEnvironments?.some((e) => e.name === value))
                return 'Environment with this name already exists';
              return null;
            }}
          />
        </Box>
      )}

      {step === 'login' && (
        <Box flexDirection="column">
          <StepHeader step={2} totalSteps={3} title="Cloudflare Authentication" />
          <Info>Checking Cloudflare authentication...</Info>
        </Box>
      )}

      {step === 'account' && (
        <Box flexDirection="column">
          <StepHeader step={2} totalSteps={3} title="Account ID" />
          <Input
            label="Enter your Cloudflare Account ID"
            placeholder="Found in Cloudflare dashboard URL"
            onSubmit={(value) => {
              setAccountId(value);
              setStep('resources');
            }}
            validate={(value) => {
              if (!value.trim()) return 'Account ID is required';
              if (!/^[a-f0-9]+$/.test(value)) return 'Invalid Account ID format';
              return null;
            }}
          />
        </Box>
      )}

      {step === 'resources' && (
        <Box flexDirection="column">
          <StepHeader step={3} totalSteps={3} title="Create Resources" />
          <Box marginY={1} flexDirection="column">
            <Info>App: {appName}</Info>
            <Info>Account ID: {accountId}</Info>
            <Info>Environment: {envName}</Info>
          </Box>
          <Text>This will create:</Text>
          <Box flexDirection="column" marginLeft={2} marginY={1}>
            {!config.pagesProject && (
              <Text>- Pages Project: {appName}</Text>
            )}
            {bindings.d1 && (
              <Text>- D1 Database: {getResourceName(appName, envName, 'db')}</Text>
            )}
            {bindings.kv && (
              <Text>- KV Namespace: {getResourceName(appName, envName, 'cache')}</Text>
            )}
            {bindings.r2 && (
              <Text>- R2 Bucket: {getResourceName(appName, envName, 'storage')}</Text>
            )}
            <Text>- wrangler.toml configuration</Text>
          </Box>
          <Select
            label="Proceed with setup?"
            items={[
              { label: 'Yes, create resources', value: 'yes' },
              { label: 'No, cancel', value: 'no' },
            ]}
            onSelect={(item) => {
              if (item.value === 'yes') {
                setStep('creating');
              } else {
                exit();
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default Init;
