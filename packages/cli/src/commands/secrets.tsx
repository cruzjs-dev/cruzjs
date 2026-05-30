import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import {
  Header,
  Task,
  Input,
  Info,
  Success,
  ErrorMsg,
  type TaskStatus,
} from '../components/index';
import { Config } from '../config/index';
import { setSecret, listSecrets } from '../utils/wrangler';
import { resolveAppDir } from '../utils/shell';

type SecretsAction = 'set' | 'list';

type SecretsProps = {
  config: Config;
  rootDir: string;
  action: SecretsAction;
  envName?: string;
  name?: string;
  value?: string;
};

export const Secrets: React.FC<SecretsProps> = ({
  config,
  rootDir,
  action,
  envName,
  name,
  value,
}) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<string[]>([]);
  const [step, setStep] = useState<'name' | 'value' | 'setting' | 'done'>('name');
  const [secretName, setSecretName] = useState(name || '');
  const [secretValue, setSecretValue] = useState(value || '');

  const wranglerDir = resolveAppDir(rootDir);

  useEffect(() => {
    if (action === 'list') {
      setMessage('Fetching secrets...');
      const list = listSecrets(wranglerDir, envName);
      setSecrets(list);
      setStatus('success');
      setMessage(`Found ${list.length} secret(s)`);
      setTimeout(() => exit(), 100);
    } else if (action === 'set') {
      if (name && value) {
        // Both provided, skip to setting
        setSecretName(name);
        setSecretValue(value);
        setStep('setting');
      } else if (name) {
        // Name provided, ask for value
        setSecretName(name);
        setStep('value');
      }
      // else stay at 'name' step for input
    }
  }, [action, name, value, wranglerDir, envName, exit]);

  useEffect(() => {
    if (step === 'setting') {
      setStatus('running');
      setMessage(`Setting secret: ${secretName}`);

      const result = setSecret(secretName, secretValue, wranglerDir, envName);

      if (result.success) {
        setStatus('success');
        setMessage('Secret set successfully');
        setStep('done');
      } else {
        setError(result.error || 'Failed to set secret');
        setStatus('error');
      }

      setTimeout(() => exit(), 100);
    }
  }, [step, secretName, secretValue, wranglerDir, envName, exit]);

  const getTitle = () => {
    switch (action) {
      case 'set':
        return 'Set Secret';
      case 'list':
        return 'List Secrets';
    }
  };

  if (action === 'set' && step === 'name') {
    return (
      <Box flexDirection="column">
        <Header title="Secrets" subtitle="Set Secret" />
        <Input
          label="Enter secret name"
          placeholder="e.g., DATABASE_URL, API_KEY"
          onSubmit={(val) => {
            setSecretName(val);
            setStep('value');
          }}
          validate={(val) => {
            if (!val.trim()) return 'Secret name is required';
            if (!/^[A-Z_][A-Z0-9_]*$/.test(val))
              return 'Secret name must be uppercase with underscores';
            return null;
          }}
        />
      </Box>
    );
  }

  if (action === 'set' && step === 'value') {
    return (
      <Box flexDirection="column">
        <Header title="Secrets" subtitle="Set Secret" />
        <Info>Secret: {secretName}</Info>
        <Input
          label="Enter secret value"
          placeholder="(value will be hidden)"
          onSubmit={(val) => {
            setSecretValue(val);
            setStep('setting');
          }}
          validate={(val) => {
            if (!val) return 'Secret value is required';
            return null;
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Secrets" subtitle={getTitle()} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : action === 'list' && status === 'success' ? (
        <Box flexDirection="column">
          <Success>Secrets{envName ? ` (${envName})` : ''}:</Success>
          {secrets.length === 0 ? (
            <Info>No secrets found. Set one with: deploy secrets set &lt;name&gt;</Info>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              {secrets.map((secret) => (
                <Box key={secret}>
                  <Text color="cyan">{secret}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <Task label={getTitle()} status={status} message={message} />
      )}
    </Box>
  );
};

export default Secrets;
