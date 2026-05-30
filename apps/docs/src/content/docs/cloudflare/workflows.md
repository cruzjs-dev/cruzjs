---
title: Workflows
description: Using Cloudflare Workflows for durable, multi-step execution with automatic retries in CruzJS.
---

Cloudflare Workflows provide durable execution for multi-step processes. Each step is independently retried on failure, and the workflow state persists across Worker restarts. CruzJS scaffolds Workflows as standalone external processes.

## When to Use Workflows

Workflows are ideal when you need:

- **Multi-step processes** where each step must complete before the next begins
- **Automatic retries** for steps that may fail (API calls, external services)
- **Durable state** that survives Worker restarts and deployments
- **Long-running tasks** that exceed the 30-second Worker CPU limit
- **Status tracking** to monitor progress from your main application

Common examples: onboarding sequences, data pipeline processing, payment workflows, multi-service orchestration.

## Scaffolding a Workflow

```bash
cruz new workflow onboarding
```

This creates `external-processes/onboarding/` with:

```
external-processes/onboarding/
  src/
    index.ts          # Workflow + trigger endpoint
  wrangler.toml       # Workflow bindings
  package.json
  tsconfig.json
```

## Workflow Structure

A Workflow extends `WorkflowEntrypoint` and defines steps using `ctx.do()`:

```typescript
// external-processes/onboarding/src/index.ts
import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from 'cloudflare:workers';

type Env = {
  DB: D1Database;
  ONBOARDING_WORKFLOW: Workflow;
};

type OnboardingParams = {
  userId: string;
  email: string;
  plan: string;
};

export class OnboardingWorkflow extends WorkflowEntrypoint<Env, OnboardingParams> {
  async run(event: WorkflowEvent<OnboardingParams>, step: WorkflowStep) {
    const { userId, email, plan } = event.payload;

    // Step 1: Create default resources
    const resources = await step.do('create-default-resources', {
      retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' },
      timeout: '30 seconds',
    }, async () => {
      const db = this.env.DB;
      // Create default project, settings, etc.
      await db.prepare(
        'INSERT INTO Project (id, name, orgId) VALUES (?, ?, ?)'
      ).bind(crypto.randomUUID(), 'My First Project', userId).run();

      return { projectCreated: true };
    });

    // Step 2: Send welcome email
    await step.do('send-welcome-email', {
      retries: { limit: 3, delay: '10 seconds' },
      timeout: '15 seconds',
    }, async () => {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Welcome!',
          html: '<h1>Welcome to our platform</h1>',
        }),
      });
    });

    // Step 3: Set up billing (if paid plan)
    if (plan !== 'free') {
      await step.do('setup-billing', {
        retries: { limit: 2, delay: '30 seconds' },
        timeout: '60 seconds',
      }, async () => {
        // Create Stripe customer and subscription
        // ...
      });
    }

    // Step 4: Mark onboarding complete
    await step.do('mark-complete', async () => {
      const db = this.env.DB;
      await db.prepare(
        'UPDATE AuthIdentity SET onboardingComplete = 1 WHERE id = ?'
      ).bind(userId).run();
    });

    return { success: true, userId };
  }
}
```

### Step Configuration

Each step accepts retry and timeout options:

```typescript
await step.do('step-name', {
  retries: {
    limit: 3,                    // Max retry attempts
    delay: '5 seconds',         // Initial delay between retries
    backoff: 'exponential',     // 'constant' | 'linear' | 'exponential'
  },
  timeout: '30 seconds',        // Max execution time per attempt
}, async () => {
  // Step logic
});
```

If a step fails after all retries, the entire workflow fails. Steps that have already completed are not re-executed.

## HTTP Trigger Endpoint

The same Worker that hosts the Workflow also exposes an HTTP endpoint to trigger it:

```typescript
// external-processes/onboarding/src/index.ts (continued)
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Trigger a new workflow instance
    if (url.pathname === '/trigger' && request.method === 'POST') {
      const params = await request.json() as OnboardingParams;

      const instance = await env.ONBOARDING_WORKFLOW.create({
        params,
      });

      return Response.json({
        id: instance.id,
        status: 'started',
      });
    }

    // Check workflow status
    if (url.pathname.startsWith('/status/')) {
      const instanceId = url.pathname.split('/status/')[1];
      const instance = await env.ONBOARDING_WORKFLOW.get(instanceId);
      const status = await instance.status();

      return Response.json({
        id: instanceId,
        status: status.status,        // 'running' | 'complete' | 'errored'
        output: status.output,
        error: status.error,
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

## Status Tracking

Track workflow progress from your main CruzJS application:

```typescript
// In your main app's tRPC router
export const onboardingRouter = router({
  startOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    // Trigger the workflow via Service Binding or HTTP
    const response = await fetch('https://my-app-onboarding.workers.dev/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: ctx.session.user.id,
        email: ctx.session.user.email,
        plan: 'pro',
      }),
    });

    const { id } = await response.json();

    // Store the workflow instance ID in the job table
    await ctx.container.get(JobService).createJob({
      type: 'onboarding',
      payload: { workflowInstanceId: id },
      lookupKey: `user:${ctx.session.user.id}`,
    });

    return { workflowId: id };
  }),

  checkOnboardingStatus: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input }) => {
      const response = await fetch(
        `https://my-app-onboarding.workers.dev/status/${input.workflowId}`
      );
      return response.json();
    }),
});
```

## wrangler.toml Configuration

```toml
# external-processes/onboarding/wrangler.toml
name = "my-app-onboarding"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Workflow binding
[[workflows]]
binding = "ONBOARDING_WORKFLOW"
name = "onboarding-workflow"
class_name = "OnboardingWorkflow"

# Share D1 with the main app
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "your-database-id"

[vars]
RESEND_API_KEY = "re_xxx"
```

## Workflow vs Queue vs Job

| Feature | Workflow | Queue | Job (built-in) |
|---|---|---|---|
| Multi-step | Yes | No (single handler) | Single handler |
| Step retry | Per-step config | Per-message retry | Configurable |
| Durable state | Yes | No | Database-backed |
| Status tracking | Built-in | No | Via job table |
| Max duration | Hours | 15 min per message | 30 sec per attempt |
| Use case | Complex orchestration | Fan-out processing | Simple background tasks |

## Next Steps

- [Queues](/cloudflare/queues) -- Fan-out message processing
- [Workers](/cloudflare/workers) -- Simpler standalone Workers
- [Background Jobs](/advanced/jobs) -- Built-in job system
