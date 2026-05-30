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
import { Config, CloudflareEnvironment } from '../config/index';
import { addCustomDomain, listCustomDomains } from '../utils/wrangler';
import { resolveAppDir } from '../utils/shell';

type DomainAction = 'add' | 'list';

type DomainProps = {
  config: Config;
  saveConfig: (config: Config) => void;
  rootDir: string;
  action: DomainAction;
  envName?: string;
  domain?: string;
};

type Step = 'select-env' | 'enter-domain' | 'adding' | 'done' | 'error';

export const Domain: React.FC<DomainProps> = ({
  config,
  saveConfig,
  rootDir,
  action,
  envName,
  domain: initialDomain,
}) => {
  const { exit } = useApp();

  const [step, setStep] = useState<Step>(envName ? (initialDomain ? 'adding' : 'enter-domain') : 'select-env');
  const [selectedEnv, setSelectedEnv] = useState<CloudflareEnvironment | null>(
    envName ? config.cloudflareEnvironments?.find((e) => e.name === envName) || null : null
  );
  const [domain, setDomain] = useState(initialDomain || '');
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<string[]>([]);

  const wranglerDir = resolveAppDir(rootDir);

  useEffect(() => {
    if (action === 'list') {
      setMessage('Fetching custom domains...');
      const result = listCustomDomains(wranglerDir, envName);

      if (result.success && result.output) {
        try {
          const parsed = JSON.parse(result.output);
          setDomains(parsed.map((d: { hostname: string }) => d.hostname));
        } catch {
          setDomains([]);
        }
      }

      setStatus('success');
      setTimeout(() => exit(), 100);
    }
  }, [action, wranglerDir, envName, exit]);

  useEffect(() => {
    if (step === 'adding' && domain && selectedEnv) {
      setStatus('running');
      setMessage(`Adding domain: ${domain}`);

      const result = addCustomDomain(domain, wranglerDir, selectedEnv.name !== 'production' ? selectedEnv.name : undefined);

      if (result.success) {
        // Update config with custom domain
        const envIndex = config.cloudflareEnvironments.findIndex((e) => e.name === selectedEnv.name);
        if (envIndex >= 0) {
          config.cloudflareEnvironments[envIndex].customDomain = domain;
          saveConfig(config);
        }

        setStatus('success');
        setMessage('Domain added successfully');
        setStep('done');
      } else {
        setError(result.error || 'Failed to add domain');
        setStep('error');
      }
    }
  }, [step, domain, selectedEnv, wranglerDir, config, saveConfig]);

  if (action === 'list') {
    return (
      <Box flexDirection="column">
        <Header title="Domain" subtitle="List Domains" />

        {status === 'success' ? (
          <Box flexDirection="column">
            <Success>Custom Domains:</Success>
            {domains.length === 0 ? (
              <Info>No custom domains configured.</Info>
            ) : (
              <Box flexDirection="column" marginTop={1}>
                {domains.map((d) => (
                  <Box key={d}>
                    <Text color="cyan">{d}</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Task label="List Domains" status={status} message={message} />
        )}
      </Box>
    );
  }

  if (step === 'error') {
    return (
      <Box flexDirection="column">
        <Header title="Domain" subtitle="Failed" />
        <ErrorMsg>{error}</ErrorMsg>
      </Box>
    );
  }

  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <Header title="Domain" subtitle="Complete" />
        <Success>Custom domain added!</Success>
        <Box marginY={1}>
          <Info>Domain: {domain}</Info>
          <Info>Environment: {selectedEnv?.name}</Info>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow" bold>Next steps:</Text>
        </Box>
        <Box flexDirection="column" marginLeft={2}>
          <Text>1. Add a CNAME record pointing to your worker</Text>
          <Text>2. Wait for DNS propagation</Text>
          <Text>3. SSL certificate will be provisioned automatically</Text>
        </Box>
      </Box>
    );
  }

  const environments = config.cloudflareEnvironments || [];

  if (step === 'select-env') {
    if (environments.length === 0) {
      return (
        <Box flexDirection="column">
          <Header title="Domain" />
          <ErrorMsg>No Cloudflare environments configured.</ErrorMsg>
          <Info>Run "deploy init" to set up a Cloudflare environment first.</Info>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Header title="Domain" subtitle="Add Custom Domain" />
        <Select
          label="Select environment"
          items={environments.map((env) => ({
            label: env.name,
            value: env.name,
            description: env.customDomain || env.d1?.name || '',
          }))}
          onSelect={(item) => {
            const env = environments.find((e) => e.name === item.value);
            setSelectedEnv(env || null);
            setStep('enter-domain');
          }}
        />
      </Box>
    );
  }

  if (step === 'enter-domain') {
    return (
      <Box flexDirection="column">
        <Header title="Domain" subtitle={selectedEnv?.name} />
        <StepHeader step={2} title="Enter Domain" />
        <Input
          label="Enter custom domain"
          placeholder="e.g., app.example.com"
          onSubmit={(val) => {
            setDomain(val);
            setStep('adding');
          }}
          validate={(val) => {
            if (!val.trim()) return 'Domain is required';
            if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(val))
              return 'Invalid domain format';
            return null;
          }}
        />
      </Box>
    );
  }

  if (step === 'adding') {
    return (
      <Box flexDirection="column">
        <Header title="Domain" subtitle={selectedEnv?.name} />
        <Task label="Add Custom Domain" status={status} message={message} />
      </Box>
    );
  }

  return null;
};

export default Domain;
