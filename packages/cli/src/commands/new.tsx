import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Task, Success, ErrorMsg, Info, type TaskStatus } from '../components/index';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

export type NewKind = 'worker' | 'workflow' | 'queue-worker' | 'feature';

type NewProps = {
  rootDir: string;
  kind: NewKind;
  name: string;
  queue?: string; // for queue-worker: the queue name to consume
};

// ── Templates ────────────────────────────────────────────────────────────────

function workerTemplate(name: string): Record<string, string> {
  const className = toPascalCase(name);
  return {
    'src/index.ts': `/**
 * ${className} Worker
 *
 * Standalone Cloudflare Worker deployed via \`cruz deploy\`.
 * Edit the fetch handler below or add scheduled/queue handlers.
 */

export interface Env {
  // Add bindings here (KV, D1, R2, etc.)
  // MY_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', worker: '${name}' });
    }

    return Response.json({ message: 'Hello from ${name} worker!' });
  },
} satisfies ExportedHandler<Env>;
`,
    'wrangler.toml': `name = "${name}"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# [vars]
# MY_VAR = "value"

# [[kv_namespaces]]
# binding = "MY_KV"
# id = "your-kv-id"
`,
    'package.json': JSON.stringify(
      {
        name: name,
        private: true,
        scripts: {
          dev: 'wrangler dev',
          deploy: 'wrangler deploy',
        },
        devDependencies: {
          '@cloudflare/workers-types': '^4.20260124.0',
          wrangler: '^3.99.0',
          typescript: '^5.9.3',
        },
      },
      null,
      2
    ),
    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          lib: ['ES2022'],
          types: ['@cloudflare/workers-types'],
          strict: true,
          noEmit: true,
        },
        include: ['src'],
      },
      null,
      2
    ),
  };
}

function workflowTemplate(name: string): Record<string, string> {
  const className = toPascalCase(name);
  return {
    'src/index.ts': `/**
 * ${className} Workflow
 *
 * Cloudflare Workflow with durable, retryable steps.
 * Triggered via API, queue, or \`cruz workflow trigger ${name}\`.
 */

import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from 'cloudflare:workers';

export interface Env {
  // Add bindings here
  // DB: D1Database;
  ${className.toUpperCase()}: Workflow;
}

type WorkflowParams = {
  // Define your workflow input
  itemId: string;
};

export class ${className} extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const input = event.payload;

    // Step 1: Validate
    const validated = await step.do('validate-input', async () => {
      console.log('Validating:', input.itemId);
      return { valid: true, itemId: input.itemId };
    });

    if (!validated.valid) {
      return { success: false, error: 'Validation failed' };
    }

    // Step 2: Process
    const result = await step.do('process', async () => {
      // Your processing logic here
      console.log('Processing:', validated.itemId);
      return { processed: true };
    });

    // Step 3: Finalize
    await step.do('finalize', async () => {
      console.log('Finalizing:', validated.itemId);
    });

    return { success: true, itemId: input.itemId };
  }
}

// HTTP entrypoint — trigger workflow or check status
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', workflow: '${name}' });
    }

    if (request.method === 'POST' && url.pathname === '/trigger') {
      const params = await request.json() as WorkflowParams;
      const instance = await env.${className.toUpperCase()}.create({ params });
      return Response.json({ id: instance.id });
    }

    if (url.pathname.startsWith('/status/')) {
      const id = url.pathname.split('/status/')[1];
      const instance = await env.${className.toUpperCase()}.get(id);
      return Response.json({
        id: instance.id,
        status: await instance.status(),
      });
    }

    return Response.json({ message: '${className} workflow. POST /trigger to start.' });
  },
} satisfies ExportedHandler<Env>;
`,
    'wrangler.toml': `name = "${name}"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[[workflows]]
name = "${name}"
binding = "${className.toUpperCase()}"
class_name = "${className}"

# [vars]
# MY_VAR = "value"
`,
    'package.json': JSON.stringify(
      {
        name: name,
        private: true,
        scripts: {
          dev: 'wrangler dev',
          deploy: 'wrangler deploy',
        },
        devDependencies: {
          '@cloudflare/workers-types': '^4.20260124.0',
          wrangler: '^3.99.0',
          typescript: '^5.9.3',
        },
      },
      null,
      2
    ),
    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          lib: ['ES2022'],
          types: ['@cloudflare/workers-types'],
          strict: true,
          noEmit: true,
        },
        include: ['src'],
      },
      null,
      2
    ),
  };
}

function queueWorkerTemplate(
  name: string,
  queueName: string
): Record<string, string> {
  const className = toPascalCase(name);
  const queueBinding = queueName.toUpperCase().replace(/-/g, '_') + '_QUEUE';

  return {
    'src/index.ts': `/**
 * ${className} Queue Consumer
 *
 * Consumes messages from the "${queueName}" queue.
 * Messages can be sent from the main Pages app or any other worker.
 *
 * To send messages from the Pages app, add this to cruz.config.ts:
 *   bindings: { queues: true }
 * Then use: env.${queueBinding}.send({ type: 'example', data: {} })
 */

export interface Env {
  // The queue this worker consumes from
  ${queueBinding}: Queue;
  // Add other bindings (D1, KV, etc.)
  // DB: D1Database;
}

type QueueMessage = {
  type: string;
  data: Record<string, unknown>;
  timestamp?: string;
};

export default {
  // HTTP entrypoint — health check + manual enqueue
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', consumer: '${name}', queue: '${queueName}' });
    }

    // Manual enqueue via POST
    if (request.method === 'POST' && url.pathname === '/enqueue') {
      const message = await request.json() as QueueMessage;
      await env.${queueBinding}.send({
        ...message,
        timestamp: new Date().toISOString(),
      });
      return Response.json({ queued: true });
    }

    return Response.json({
      message: '${className} queue consumer.',
      queue: '${queueName}',
      endpoints: { health: '/health', enqueue: 'POST /enqueue' },
    });
  },

  // Queue consumer — processes batches of messages
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    console.log(\`Processing batch of \${batch.messages.length} messages from \${batch.queue}\`);

    for (const msg of batch.messages) {
      try {
        const { type, data } = msg.body;
        console.log(\`Processing message: \${type}\`, data);

        switch (type) {
          // Add your message type handlers here
          // case 'user.created':
          //   await handleUserCreated(data, env);
          //   break;
          default:
            console.log(\`Unknown message type: \${type}\`);
        }

        msg.ack();
      } catch (error) {
        console.error(\`Failed to process message:\`, error);
        msg.retry({ delaySeconds: 30 });
      }
    }
  },
} satisfies ExportedHandler<Env>;
`,
    'wrangler.toml': `name = "${name}"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Queue consumer configuration
[[queues.consumers]]
queue = "${queueName}"
max_batch_size = 10
max_batch_timeout = 30

# Producer binding (so this worker can also enqueue messages)
[[queues.producers]]
binding = "${queueBinding}"
queue = "${queueName}"

# [vars]
# MY_VAR = "value"
`,
    'package.json': JSON.stringify(
      {
        name: name,
        private: true,
        scripts: {
          dev: 'wrangler dev',
          deploy: 'wrangler deploy',
        },
        devDependencies: {
          '@cloudflare/workers-types': '^4.20260124.0',
          wrangler: '^3.99.0',
          typescript: '^5.9.3',
        },
      },
      null,
      2
    ),
    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          lib: ['ES2022'],
          types: ['@cloudflare/workers-types'],
          strict: true,
          noEmit: true,
        },
        include: ['src'],
      },
      null,
      2
    ),
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export const New: React.FC<NewProps> = ({ rootDir, kind, name, queue }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [error, setError] = useState<string | null>(null);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);

  useEffect(() => {
    const run = () => {
      const targetDir = resolve(rootDir, 'external-processes', name);

      if (existsSync(targetDir)) {
        setError(`Directory already exists: external-processes/${name}`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      // Pick template
      let files: Record<string, string>;
      switch (kind) {
        case 'worker':
          files = workerTemplate(name);
          break;
        case 'workflow':
          files = workflowTemplate(name);
          break;
        case 'queue-worker':
          files = queueWorkerTemplate(name, queue || `${name}-queue`);
          break;
        default:
          files = {};
          break;
      }

      // Write files
      const written: string[] = [];
      for (const [relPath, content] of Object.entries(files)) {
        const fullPath = join(targetDir, relPath);
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        mkdirSync(dir, { recursive: true });
        writeFileSync(fullPath, content, 'utf-8');
        written.push(`external-processes/${name}/${relPath}`);
      }

      setCreatedFiles(written);
      setStatus('success');
      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, kind, name, queue, exit]);

  const kindLabel =
    kind === 'queue-worker'
      ? 'Queue Consumer'
      : kind.charAt(0).toUpperCase() + kind.slice(1);

  return (
    <Box flexDirection="column">
      <Header title={`New ${kindLabel}`} subtitle={name} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : status === 'success' ? (
        <Box flexDirection="column">
          <Success>Created {kindLabel.toLowerCase()}: {name}</Success>
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            {createdFiles.map((f) => (
              <Text key={f} color="gray">
                + {f}
              </Text>
            ))}
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Info>Next steps:</Info>
            <Text color="gray">  cd external-processes/{name}</Text>
            <Text color="gray">  npm install</Text>
            <Text color="gray">  npx wrangler dev        # local dev</Text>
            <Text color="gray">  cruz deploy production   # auto-deploys with main app</Text>
            {kind === 'queue-worker' && (
              <>
                <Text> </Text>
                <Info>Create the queue on Cloudflare:</Info>
                <Text color="gray">  cruz queue create {queue || `${name}-queue`}</Text>
                <Text> </Text>
                <Info>Send messages from your Pages app:</Info>
                <Text color="gray">  env.{(queue || `${name}-queue`).toUpperCase().replace(/-/g, '_')}_QUEUE.send({'{'} type: 'example', data: {'{'} {'}'} {'}'})</Text>
              </>
            )}
          </Box>
        </Box>
      ) : (
        <Task label={`Scaffolding ${kindLabel.toLowerCase()}`} status={status} message="" />
      )}
    </Box>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

export default New;
