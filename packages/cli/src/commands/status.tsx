import React from 'react';
import { Box, Text } from 'ink';
import { Config, CloudflareEnvironment } from '../config/index';
import { Header, Info, ErrorMsg } from '../components/index';

type StatusProps = {
  config: Config;
  rootDir: string;
  envName?: string;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'Never';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
};

const EnvironmentDetail: React.FC<{ env: CloudflareEnvironment; pagesProject?: string }> = ({
  env,
  pagesProject,
}) => {
  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{env.name}</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Box>
          <Text color="gray">Account ID:    </Text>
          <Text>{env.accountId || 'Not set'}</Text>
        </Box>
        <Box>
          <Text color="gray">Created:       </Text>
          <Text>{formatDate(env.createdAt)}</Text>
        </Box>
        <Box>
          <Text color="gray">Last Deployed: </Text>
          <Text>{formatDate(env.deployedAt)}</Text>
        </Box>
        {pagesProject && (
          <Box>
            <Text color="gray">Pages Project: </Text>
            <Text>{pagesProject}</Text>
          </Box>
        )}
        {env.customDomain && (
          <Box>
            <Text color="gray">Custom Domain: </Text>
            <Text color="cyan" underline>https://{env.customDomain}</Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text bold>Resources:</Text>
        </Box>

        {env.d1 ? (
          <Box marginLeft={2}>
            <Text color="yellow">D1  </Text>
            <Text>{env.d1.name}</Text>
            <Text color="gray"> ({env.d1.databaseId})</Text>
          </Box>
        ) : (
          <Box marginLeft={2}>
            <Text color="gray">D1  None</Text>
          </Box>
        )}

        {env.kv ? (
          <Box marginLeft={2}>
            <Text color="yellow">KV  </Text>
            <Text>{env.kv.name}</Text>
            <Text color="gray"> ({env.kv.namespaceId})</Text>
          </Box>
        ) : (
          <Box marginLeft={2}>
            <Text color="gray">KV  None</Text>
          </Box>
        )}

        {env.r2 ? (
          <Box marginLeft={2}>
            <Text color="yellow">R2  </Text>
            <Text>{env.r2.name}</Text>
          </Box>
        ) : (
          <Box marginLeft={2}>
            <Text color="gray">R2  None</Text>
          </Box>
        )}

        {env.queues && env.queues.length > 0 && (
          <>
            {env.queues.map((q) => (
              <Box key={q.name} marginLeft={2}>
                <Text color="yellow">Queue </Text>
                <Text>{q.name}</Text>
                <Text color="gray"> ({q.queueId})</Text>
              </Box>
            ))}
          </>
        )}

        {env.vectorize && env.vectorize.length > 0 && (
          <>
            {env.vectorize.map((v) => (
              <Box key={v.name} marginLeft={2}>
                <Text color="yellow">Vectorize </Text>
                <Text>{v.name}</Text>
                <Text color="gray"> ({v.indexName})</Text>
              </Box>
            ))}
          </>
        )}
      </Box>
    </Box>
  );
};

export const Status: React.FC<StatusProps> = ({ config, rootDir, envName }) => {
  const environments = config.cloudflareEnvironments || [];

  if (environments.length === 0) {
    return (
      <Box flexDirection="column">
        <Header title="Status" />
        <ErrorMsg>No environments configured.</ErrorMsg>
        <Info>Run "deploy init" to set up an environment first.</Info>
      </Box>
    );
  }

  // Single environment detail view
  if (envName) {
    const env = environments.find((e) => e.name === envName);
    if (!env) {
      return (
        <Box flexDirection="column">
          <Header title="Status" />
          <ErrorMsg>Environment "{envName}" not found.</ErrorMsg>
          <Info>
            Available environments: {environments.map((e) => e.name).join(', ')}
          </Info>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Header title="Status" subtitle={envName} />
        <EnvironmentDetail env={env} pagesProject={config.pagesProject} />
      </Box>
    );
  }

  // Overview table of all environments
  const nameWidth = Math.max(12, ...environments.map((e) => e.name.length)) + 2;
  const d1Width = Math.max(6, ...environments.map((e) => (e.d1?.name || '-').length)) + 2;
  const kvWidth = Math.max(6, ...environments.map((e) => (e.kv?.name || '-').length)) + 2;
  const r2Width = Math.max(6, ...environments.map((e) => (e.r2?.name || '-').length)) + 2;
  const domainWidth = Math.max(8, ...environments.map((e) => (e.customDomain || '-').length)) + 2;
  const deployWidth = 22;

  return (
    <Box flexDirection="column">
      <Header title="Status" subtitle={`${environments.length} environment${environments.length !== 1 ? 's' : ''}`} />

      {config.pagesProject && (
        <Box marginBottom={1}>
          <Text color="gray">Pages Project: </Text>
          <Text bold>{config.pagesProject}</Text>
        </Box>
      )}

      {/* Table header */}
      <Box>
        <Box width={nameWidth}>
          <Text bold color="cyan">Name</Text>
        </Box>
        <Box width={d1Width}>
          <Text bold color="cyan">D1</Text>
        </Box>
        <Box width={kvWidth}>
          <Text bold color="cyan">KV</Text>
        </Box>
        <Box width={r2Width}>
          <Text bold color="cyan">R2</Text>
        </Box>
        <Box width={domainWidth}>
          <Text bold color="cyan">Domain</Text>
        </Box>
        <Box width={deployWidth}>
          <Text bold color="cyan">Last Deployed</Text>
        </Box>
      </Box>

      {/* Separator */}
      <Box>
        <Text color="gray">
          {'-'.repeat(nameWidth + d1Width + kvWidth + r2Width + domainWidth + deployWidth)}
        </Text>
      </Box>

      {/* Rows */}
      {environments.map((env) => (
        <Box key={env.name}>
          <Box width={nameWidth}>
            <Text bold>{env.name}</Text>
          </Box>
          <Box width={d1Width}>
            <Text>{env.d1?.name || '-'}</Text>
          </Box>
          <Box width={kvWidth}>
            <Text>{env.kv?.name || '-'}</Text>
          </Box>
          <Box width={r2Width}>
            <Text>{env.r2?.name || '-'}</Text>
          </Box>
          <Box width={domainWidth}>
            <Text>{env.customDomain || '-'}</Text>
          </Box>
          <Box width={deployWidth}>
            <Text color={env.deployedAt ? 'green' : 'gray'}>
              {formatDate(env.deployedAt)}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default Status;
