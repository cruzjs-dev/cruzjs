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
import {
  isWranglerInstalled,
  isWranglerLoggedIn,
  wranglerLogin,
  getAccountId,
  createD1Database,
  createR2Bucket,
  createKVNamespace,
} from '../utils/wrangler';
import { loadCruzConfig, getResourceName } from '../config/cruz-config';
import { generateWranglerToml } from '../config/wrangler-generator';
import { existsSync, writeFileSync, readFileSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import { resolveAppDir } from '../utils/shell';
import { execSync } from 'child_process';
import type { CruzConfig } from '../define-config';

type SetupProps = {
  config: Config;
  saveConfig: (config: Config) => void;
  rootDir: string;
};

type Step =
  | 'welcome'
  | 'check-wrangler'
  | 'install-wrangler'
  | 'check-login'
  | 'login'
  | 'login-failed'
  | 'get-account'
  | 'env-name'
  | 'confirm-resources'
  | 'creating'
  | 'check-drizzle'
  | 'api-token'
  | 'done'
  | 'error';

type SetupTask = {
  id: string;
  label: string;
  status: TaskStatus;
  message?: string;
};

export const Setup: React.FC<SetupProps> = ({
  config,
  saveConfig,
  rootDir,
}) => {
  const { exit } = useApp();

  const [step, setStep] = useState<Step>('welcome');
  const [envName, setEnvName] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<SetupTask[]>([]);
  const [createdEnv, setCreatedEnv] = useState<CloudflareEnvironment | null>(null);
  const [wranglerInstalled, setWranglerInstalled] = useState(false);
  const [wranglerLoggedIn, setWranglerLoggedIn] = useState(false);
  const [hasDrizzleConfig, setHasDrizzleConfig] = useState(false);
  const [apiToken, setApiToken] = useState<string | null>(null);

  const wranglerDir = resolveAppDir(rootDir);

  const updateTask = (id: string, updates: Partial<SetupTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  // Check prerequisites on welcome confirmation
  useEffect(() => {
    if (step === 'check-wrangler') {
      const installed = isWranglerInstalled();
      setWranglerInstalled(installed);

      if (installed) {
        setStep('check-login');
      } else {
        setStep('install-wrangler');
      }
    }
  }, [step]);

  // Check login status
  useEffect(() => {
    if (step === 'check-login') {
      const loggedIn = isWranglerLoggedIn(wranglerDir);
      setWranglerLoggedIn(loggedIn);

      if (loggedIn) {
        const id = getAccountId(wranglerDir);
        if (id) {
          setAccountId(id);
          setStep('env-name');
        } else {
          setStep('get-account');
        }
      } else {
        setStep('login');
      }
    }
  }, [step, wranglerDir]);

  // Handle login
  useEffect(() => {
    if (step === 'login') {
      console.log('\n\x1b[36m●\x1b[0m Opening browser for Cloudflare login...\n');
      console.log('\x1b[90m  Complete the login in your browser, then return here.\x1b[0m\n');

      // Run login (ignore return status as it's unreliable for interactive commands)
      wranglerLogin(wranglerDir);

      // After login completes, check if we're actually logged in now
      const loggedIn = isWranglerLoggedIn(wranglerDir);

      if (loggedIn) {
        const id = getAccountId(wranglerDir);
        if (id) {
          setAccountId(id);
          setStep('env-name');
        } else {
          setStep('get-account');
        }
      } else {
        // Login didn't work - go to manual account entry with helpful message
        setStep('login-failed');
      }
    }
  }, [step, wranglerDir]);

  // Create resources
  useEffect(() => {
    if (step === 'creating') {
      createResources();
    }
  }, [step]);

  const installWrangler = () => {
    try {
      console.log('\n\x1b[36m●\x1b[0m Installing wrangler...\n');
      execSync('npm install -g wrangler', { stdio: 'inherit' });
      setWranglerInstalled(true);
      setStep('check-login');
    } catch (err) {
      setError('Failed to install wrangler. Please run: npm install -g wrangler');
      setStep('error');
    }
  };

  const createResources = async () => {
    // Try to load cruz.config.ts for resource naming; fall back to defaults
    let cruzConfig: CruzConfig | undefined;
    try {
      cruzConfig = await loadCruzConfig(rootDir);
    } catch {
      // No cruz.config.ts yet — use defaults
    }

    const appName = cruzConfig?.name || 'cruzjs';

    setTasks([
      { id: 'd1', label: 'Create D1 database', status: 'pending' },
      { id: 'r2', label: 'Create R2 bucket', status: 'pending' },
      { id: 'kv', label: 'Create KV namespace', status: 'pending' },
      { id: 'wrangler', label: 'Generate wrangler.toml', status: 'pending' },
    ]);

    try {
      // Step 1: Create D1 database
      updateTask('d1', { status: 'running' });
      const d1Name = getResourceName(appName, envName, 'db');
      const d1Result = createD1Database(d1Name, wranglerDir);

      if (!d1Result.success) {
        if (d1Result.error?.includes('already exists')) {
          updateTask('d1', { status: 'success', message: 'Already exists' });
        } else {
          throw new Error(`Failed to create D1 database: ${d1Result.error}`);
        }
      } else {
        updateTask('d1', { status: 'success', message: `ID: ${d1Result.databaseId}` });
      }

      // Step 2: Create R2 bucket
      updateTask('r2', { status: 'running' });
      const r2Name = getResourceName(appName, envName, 'storage');
      const r2Result = createR2Bucket(r2Name, wranglerDir);

      if (!r2Result.success) {
        if (r2Result.error?.includes('already exists')) {
          updateTask('r2', { status: 'success', message: 'Already exists' });
        } else {
          throw new Error(`Failed to create R2 bucket: ${r2Result.error}`);
        }
      } else {
        updateTask('r2', { status: 'success' });
      }

      // Step 3: Create KV namespace
      updateTask('kv', { status: 'running' });
      const kvTitle = getResourceName(appName, envName, 'cache');
      const kvResult = createKVNamespace(kvTitle, wranglerDir);

      if (!kvResult.success) {
        if (kvResult.error?.includes('already exists')) {
          updateTask('kv', { status: 'success', message: 'Already exists' });
        } else {
          throw new Error(`Failed to create KV namespace: ${kvResult.error}`);
        }
      } else {
        updateTask('kv', { status: 'success', message: `ID: ${kvResult.namespaceId}` });
      }

      // Step 4: Generate wrangler.toml
      updateTask('wrangler', { status: 'running' });
      const wranglerPath = resolve(wranglerDir, 'wrangler.toml');

      const newEnvForToml: CloudflareEnvironment = {
        name: envName,
        accountId: accountId!,
        d1: { name: d1Name, databaseId: d1Result.databaseId || '' },
        r2: { name: r2Name },
        kv: { name: kvTitle, namespaceId: kvResult.namespaceId || '' },
        createdAt: new Date().toISOString(),
      };

      if (cruzConfig) {
        const wranglerContent = generateWranglerToml(cruzConfig, newEnvForToml, envName);
        writeFileSync(wranglerPath, wranglerContent);
        updateTask('wrangler', { status: 'success', message: 'Generated' });
      } else if (!existsSync(wranglerPath)) {
        updateTask('wrangler', { status: 'success', message: 'Skipped (no cruz.config.ts)' });
      } else {
        updateTask('wrangler', { status: 'success', message: 'Already exists' });
      }

      // Save environment to config
      const newEnv: CloudflareEnvironment = {
        name: envName,
        accountId: accountId!,
        d1: {
          name: d1Name,
          databaseId: d1Result.databaseId || '',
        },
        r2: {
          name: r2Name,
        },
        kv: {
          name: kvTitle,
          namespaceId: kvResult.namespaceId || '',
        },
        createdAt: new Date().toISOString(),
      };

      config.cloudflareEnvironments = config.cloudflareEnvironments || [];
      config.cloudflareEnvironments.push(newEnv);
      saveConfig(config);
      setCreatedEnv(newEnv);

      // Check for drizzle config
      const drizzleD1Config = existsSync(resolve(rootDir, 'drizzle.config.d1.ts'));
      const drizzleConfig = existsSync(resolve(rootDir, 'drizzle.config.ts'));
      setHasDrizzleConfig(drizzleD1Config || drizzleConfig);

      // Check if API token already exists in .env.local
      const envLocalPath = resolve(rootDir, '.env.local');
      if (existsSync(envLocalPath)) {
        const envContent = readFileSync(envLocalPath, 'utf-8');
        if (envContent.includes('CLOUDFLARE_API_TOKEN=')) {
          setStep('done');
          return;
        }
      }

      setStep('api-token');
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
    }
  };

  // Welcome screen
  if (step === 'welcome') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Cloudflare Deployment Setup Wizard" />

        <Box flexDirection="column" marginY={1}>
          <Text>Welcome to the Cruz Deploy setup wizard!</Text>
          <Text> </Text>
          <Text>This will help you:</Text>
          <Box flexDirection="column" marginLeft={2}>
            <Text color="cyan">1.</Text><Text> Check and install prerequisites</Text>
            <Text color="cyan">2.</Text><Text> Authenticate with Cloudflare</Text>
            <Text color="cyan">3.</Text><Text> Create your first environment with D1, R2, and KV</Text>
            <Text color="cyan">4.</Text><Text> Generate wrangler.toml configuration</Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginY={1}>
          <Text color="yellow" bold>Prerequisites:</Text>
          <Box flexDirection="column" marginLeft={2}>
            <Text>- Node.js 18+ installed</Text>
            <Text>- A Cloudflare account (free tier works!)</Text>
            <Text>- A browser for authentication</Text>
          </Box>
        </Box>

        <Select
          label="Ready to begin?"
          items={[
            { label: 'Yes, let\'s go!', value: 'yes' },
            { label: 'No, exit setup', value: 'no' },
          ]}
          onSelect={(item) => {
            if (item.value === 'yes') {
              setStep('check-wrangler');
            } else {
              exit();
            }
          }}
        />
      </Box>
    );
  }

  // Checking wrangler
  if (step === 'check-wrangler') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Checking Prerequisites" />
        <Task label="Checking for Wrangler CLI" status="running" />
      </Box>
    );
  }

  // Install wrangler prompt
  if (step === 'install-wrangler') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Install Wrangler" />
        <StepHeader step={1} totalSteps={4} title="Install Wrangler CLI" />

        <Box marginY={1}>
          <ErrorMsg>Wrangler CLI is not installed.</ErrorMsg>
        </Box>

        <Text>Wrangler is Cloudflare's CLI tool for managing Workers, D1, R2, and KV.</Text>
        <Text> </Text>

        <Select
          label="Would you like to install it now?"
          items={[
            { label: 'Yes, install wrangler globally', value: 'install' },
            { label: 'No, I\'ll install it manually', value: 'manual' },
          ]}
          onSelect={(item) => {
            if (item.value === 'install') {
              installWrangler();
            } else {
              console.log('\nTo install manually, run: npm install -g wrangler\n');
              exit();
            }
          }}
        />
      </Box>
    );
  }

  // Checking login
  if (step === 'check-login') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Checking Authentication" />
        <Task label="Checking Wrangler CLI" status="success" message="Installed" />
        <Task label="Checking Cloudflare authentication" status="running" />
      </Box>
    );
  }

  // Login prompt
  if (step === 'login') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Cloudflare Authentication" />
        <StepHeader step={2} totalSteps={4} title="Login to Cloudflare" />
        <Task label="Opening browser for authentication..." status="running" />
        <Box marginTop={1}>
          <Info>Please complete the login in your browser.</Info>
        </Box>
      </Box>
    );
  }

  // Login failed - offer options
  if (step === 'login-failed') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Authentication" />
        <StepHeader step={2} totalSteps={4} title="Login to Cloudflare" />

        <Box marginY={1}>
          <ErrorMsg>Could not verify Cloudflare authentication.</ErrorMsg>
        </Box>

        <Text>This can happen if:</Text>
        <Box flexDirection="column" marginLeft={2} marginY={1}>
          <Text color="gray">- The browser login wasn't completed</Text>
          <Text color="gray">- The authentication is still processing</Text>
          <Text color="gray">- There was a network issue</Text>
        </Box>

        <Select
          label="What would you like to do?"
          items={[
            { label: 'Try logging in again', value: 'retry' },
            { label: 'Enter Account ID manually', value: 'manual' },
            { label: 'Cancel setup', value: 'cancel' },
          ]}
          onSelect={(item) => {
            if (item.value === 'retry') {
              setStep('login');
            } else if (item.value === 'manual') {
              setStep('get-account');
            } else {
              exit();
            }
          }}
        />
      </Box>
    );
  }

  // Get account ID manually
  if (step === 'get-account') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Account Configuration" />
        <StepHeader step={2} totalSteps={4} title="Cloudflare Account" />

        <Box marginY={1}>
          <Text>Enter your Cloudflare Account ID to continue.</Text>
        </Box>

        <Text color="gray">You can find your Account ID in the Cloudflare dashboard URL:</Text>
        <Text color="gray">https://dash.cloudflare.com/</Text>
        <Text color="cyan">{"<account-id>"}</Text>
        <Text color="gray">/...</Text>
        <Text> </Text>

        <Input
          label="Enter your Cloudflare Account ID"
          placeholder="e.g., abc123def456..."
          onSubmit={(value) => {
            setAccountId(value);
            setStep('env-name');
          }}
          validate={(value) => {
            if (!value.trim()) return 'Account ID is required';
            if (!/^[a-f0-9]+$/.test(value)) return 'Invalid Account ID format (should be hex characters)';
            return null;
          }}
        />
      </Box>
    );
  }

  // Environment name input
  if (step === 'env-name') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Environment Setup" />
        <Task label="Wrangler CLI" status="success" message="Installed" />
        <Task label="Cloudflare authentication" status="success" message={`Account: ${accountId?.slice(0, 8)}...`} />

        <Box marginY={1}>
          <StepHeader step={3} totalSteps={4} title="Create Environment" />
        </Box>

        <Text>Choose a name for your first environment.</Text>
        <Text color="gray">Common choices: production, staging, development</Text>
        <Text> </Text>

        <Input
          label="Environment name"
          placeholder="e.g., production"
          onSubmit={(value) => {
            setEnvName(value);
            setStep('confirm-resources');
          }}
          validate={(value) => {
            if (!value.trim()) return 'Name is required';
            if (!/^[a-z0-9-]+$/.test(value)) return 'Name must be lowercase alphanumeric with dashes';
            if (config.cloudflareEnvironments?.some((e) => e.name === value)) {
              return 'Environment with this name already exists';
            }
            return null;
          }}
        />
      </Box>
    );
  }

  // Confirm resources
  if (step === 'confirm-resources') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Confirm Resources" />
        <StepHeader step={4} totalSteps={4} title="Create Cloudflare Resources" />

        <Box marginY={1} flexDirection="column">
          <Info>Account ID: {accountId}</Info>
          <Info>Environment: {envName}</Info>
        </Box>

        <Text>The following resources will be created:</Text>
        <Box flexDirection="column" marginLeft={2} marginY={1}>
          <Text color="cyan">D1 Database:</Text>
          <Text>  cruzjs-{envName}-db</Text>
          <Text> </Text>
          <Text color="cyan">R2 Bucket:</Text>
          <Text>  cruzjs-{envName}-storage</Text>
          <Text> </Text>
          <Text color="cyan">KV Namespace:</Text>
          <Text>  cruzjs-{envName}-cache</Text>
          <Text> </Text>
          <Text color="cyan">Configuration:</Text>
          <Text>  wrangler.toml</Text>
        </Box>

        <Select
          label="Create these resources?"
          items={[
            { label: 'Yes, create resources', value: 'yes' },
            { label: 'No, go back', value: 'back' },
            { label: 'Cancel setup', value: 'cancel' },
          ]}
          onSelect={(item) => {
            if (item.value === 'yes') {
              setStep('creating');
            } else if (item.value === 'back') {
              setStep('env-name');
            } else {
              exit();
            }
          }}
        />
      </Box>
    );
  }

  // Creating resources
  if (step === 'creating') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Creating Resources" />
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

  // API Token step
  if (step === 'api-token') {
    const saveApiToken = (token: string) => {
      const envLocalPath = resolve(rootDir, '.env.local');
      const tokenLine = `CLOUDFLARE_API_TOKEN=${token}\n`;

      if (existsSync(envLocalPath)) {
        // Append to existing file
        appendFileSync(envLocalPath, tokenLine);
      } else {
        // Create new file
        writeFileSync(envLocalPath, tokenLine);
      }

      setApiToken(token);
      setStep('done');
    };

    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="API Token" />
        <StepHeader step={5} totalSteps={5} title="Configure API Token" />

        <Box marginY={1} flexDirection="column">
          <Success>Resources created successfully!</Success>
        </Box>

        <Box marginY={1} flexDirection="column">
          <Text>To enable automated deployments, you need a Cloudflare API token.</Text>
          <Text> </Text>
          <Text color="cyan" bold>Create your API token:</Text>
          <Box flexDirection="column" marginLeft={2}>
            <Text>1. Open: <Text color="cyan" underline>https://dash.cloudflare.com/profile/api-tokens</Text></Text>
            <Text>2. Click "Create Token"</Text>
            <Text>3. Use the "Edit Cloudflare Workers" template</Text>
            <Text>4. Include your account in Account Resources</Text>
            <Text>5. Click "Continue to summary" → "Create Token"</Text>
            <Text>6. Copy the token and paste it below</Text>
          </Box>
        </Box>

        <Input
          label="Paste your API token"
          placeholder="Paste token here..."
          onSubmit={(value) => {
            if (value.trim()) {
              saveApiToken(value.trim());
            }
          }}
          validate={(value) => {
            if (!value.trim()) return 'API token is required';
            if (value.length < 20) return 'Token seems too short';
            return null;
          }}
        />

        <Box marginTop={1}>
          <Text color="gray">The token will be saved to .env.local (gitignored by default)</Text>
        </Box>
      </Box>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Error" />
        <ErrorMsg>{error}</ErrorMsg>
        <Box marginTop={1}>
          <Text color="gray">Please fix the issue and run setup again.</Text>
        </Box>
      </Box>
    );
  }

  // Done!
  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <Header title="Cruz Deploy Setup" subtitle="Complete!" />

        <Success>Your Cloudflare environment "{envName}" is ready!</Success>

        <Box marginY={1} flexDirection="column">
          <Text color="cyan" bold>Created Resources:</Text>
          <Box flexDirection="column" marginLeft={2}>
            <Text>Environment: {createdEnv?.name}</Text>
            <Text>D1 Database: {createdEnv?.d1?.name}</Text>
            <Text>R2 Bucket: {createdEnv?.r2?.name}</Text>
            <Text>KV Namespace: {createdEnv?.kv?.name}</Text>
          </Box>
        </Box>

        <Box marginY={1} flexDirection="column">
          <Text color="yellow" bold>Next Steps:</Text>
          <Box flexDirection="column" marginLeft={2}>
            <Text> </Text>
            <Text color="white">1. Review your wrangler.toml configuration:</Text>
            <Text color="gray">   {wranglerDir}/wrangler.toml</Text>
            <Text> </Text>
            {!hasDrizzleConfig && (
              <>
                <Text color="white">2. Create a Drizzle config for D1 (if using Drizzle):</Text>
                <Text color="gray">   Create drizzle.config.d1.ts with dialect: 'sqlite'</Text>
                <Text> </Text>
              </>
            )}
            <Text color="white">{hasDrizzleConfig ? '2' : '3'}. Generate and apply database migrations:</Text>
            <Text color="gray">   cruz-deploy db generate</Text>
            <Text color="gray">   cruz-deploy db migrate</Text>
            <Text> </Text>
            <Text color="white">{hasDrizzleConfig ? '3' : '4'}. Start local development:</Text>
            <Text color="gray">   npm run dev</Text>
            <Text> </Text>
            <Text color="white">{hasDrizzleConfig ? '4' : '5'}. Set secrets (if needed):</Text>
            <Text color="gray">   npm run deploy secrets set API_KEY</Text>
            <Text> </Text>
            <Text color="white">{hasDrizzleConfig ? '5' : '6'}. Deploy to Cloudflare:</Text>
            <Text color="gray">   npm run deploy deploy -e {envName}</Text>
          </Box>
        </Box>

        {apiToken && (
          <Box marginY={1} flexDirection="column">
            <Text color="green" bold>API Token configured!</Text>
            <Text color="gray">Your token is saved in .env.local for automated deployments.</Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="green">Happy deploying!</Text>
        </Box>
      </Box>
    );
  }

  return null;
};

export default Setup;
