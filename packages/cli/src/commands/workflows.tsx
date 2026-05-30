import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import {
  Header,
  Task,
  Info,
  Success,
  ErrorMsg,
  type TaskStatus,
} from '../components/index';
import { Config } from '../config/index';
import { listWorkflows, triggerWorkflow, listWorkflowInstances } from '../utils/wrangler';
import { resolveAppDir } from '../utils/shell';

type WorkflowsAction = 'list' | 'trigger' | 'instances';

type WorkflowsProps = {
  config: Config;
  rootDir: string;
  action: WorkflowsAction;
  name?: string;
  params?: string;
};

type Workflow = {
  name: string;
  class_name: string;
  script_name: string;
};

type WorkflowInstance = {
  id: string;
  status: string;
  created_on: string;
};

export const Workflows: React.FC<WorkflowsProps> = ({
  config,
  rootDir,
  action,
  name,
  params,
}) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [triggeredId, setTriggeredId] = useState<string | null>(null);

  const wranglerDir = resolveAppDir(rootDir);

  useEffect(() => {
    const run = async () => {
      switch (action) {
        case 'list': {
          setMessage('Fetching workflows...');
          const result = listWorkflows(wranglerDir);

          if (result.success && result.output) {
            try {
              const parsed = JSON.parse(result.output);
              setWorkflows(parsed);
              setStatus('success');
              setMessage(`Found ${parsed.length} workflow(s)`);
            } catch {
              setWorkflows([]);
              setStatus('success');
              setMessage('No workflows found');
            }
          } else {
            setStatus('success');
            setMessage('No workflows found');
          }
          break;
        }

        case 'trigger': {
          if (!name) {
            setError('Workflow name is required. Usage: deploy workflows trigger <name>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          setMessage(`Triggering workflow: ${name}`);

          let parsedParams = {};
          if (params) {
            try {
              parsedParams = JSON.parse(params);
            } catch {
              setError('Invalid JSON params');
              setStatus('error');
              setTimeout(() => exit(), 100);
              return;
            }
          }

          const result = triggerWorkflow(name, parsedParams, wranglerDir);

          if (result.success) {
            // Try to extract instance ID from output
            const match = result.output?.match(/instance[:\s]+([a-f0-9-]+)/i);
            if (match) {
              setTriggeredId(match[1]);
            }
            setStatus('success');
            setMessage('Workflow triggered successfully');
          } else {
            setError(result.error || 'Failed to trigger workflow');
            setStatus('error');
          }
          break;
        }

        case 'instances': {
          if (!name) {
            setError('Workflow name is required. Usage: deploy workflows instances <name>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          setMessage(`Fetching instances for: ${name}`);
          const result = listWorkflowInstances(name, wranglerDir);

          if (result.success && result.output) {
            try {
              const parsed = JSON.parse(result.output);
              setInstances(parsed);
              setStatus('success');
              setMessage(`Found ${parsed.length} instance(s)`);
            } catch {
              setInstances([]);
              setStatus('success');
              setMessage('No instances found');
            }
          } else {
            setStatus('success');
            setMessage('No instances found');
          }
          break;
        }
      }

      setTimeout(() => exit(), 100);
    };

    run();
  }, [action, name, params, wranglerDir, exit]);

  const getTitle = () => {
    switch (action) {
      case 'list':
        return 'List Workflows';
      case 'trigger':
        return 'Trigger Workflow';
      case 'instances':
        return 'Workflow Instances';
    }
  };

  return (
    <Box flexDirection="column">
      <Header title="Workflows" subtitle={getTitle()} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : action === 'list' && status === 'success' ? (
        <Box flexDirection="column">
          <Success>Workflows:</Success>
          {workflows.length === 0 ? (
            <Info>No workflows found. Configure workflows in wrangler.toml.</Info>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              {workflows.map((wf) => (
                <Box key={wf.name} flexDirection="column" marginBottom={1}>
                  <Text color="cyan">{wf.name}</Text>
                  <Text color="gray">  Class: {wf.class_name}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ) : action === 'trigger' && status === 'success' ? (
        <Box flexDirection="column">
          <Success>Workflow triggered!</Success>
          {triggeredId && (
            <Info>Instance ID: {triggeredId}</Info>
          )}
          <Box marginTop={1}>
            <Text color="gray">View instances: deploy workflows instances {name}</Text>
          </Box>
        </Box>
      ) : action === 'instances' && status === 'success' ? (
        <Box flexDirection="column">
          <Success>Instances for "{name}":</Success>
          {instances.length === 0 ? (
            <Info>No instances found.</Info>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              {instances.map((inst) => (
                <Box key={inst.id}>
                  <Text color="cyan">{inst.id.substring(0, 8)}...</Text>
                  <Text> </Text>
                  <Text color={inst.status === 'complete' ? 'green' : inst.status === 'error' ? 'red' : 'yellow'}>
                    {inst.status}
                  </Text>
                  <Text color="gray"> {new Date(inst.created_on).toLocaleString()}</Text>
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

export default Workflows;
