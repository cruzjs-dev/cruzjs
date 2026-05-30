import { JobService } from '../jobs/job.service';
import { handleCruzAction } from '../routing';
import { CloudflareContext } from '../shared/cloudflare/context';
import type { ActionFunctionArgs } from 'react-router';
import type { JobStatus } from '../database/schema';

/**
 * POST /api/jobs/callback
 * Generic callback endpoint for external workers to update job status.
 *
 * Authentication: Bearer token with WORKER_CALLBACK_SECRET
 */
export const action = async (args: ActionFunctionArgs) => {
  await CloudflareContext.init(args.context);
  return handleCruzAction([args], async ({ request, container }) => {
    const authHeader = request.headers.get('Authorization');
    const expectedToken = process.env.WORKER_CALLBACK_SECRET;

    if (!expectedToken) {
      console.error('[Callback] WORKER_CALLBACK_SECRET not configured');
      return Response.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const payload = await request.json() as {
        action: string;
        jobId: string;
        status: string;
        error?: string;
        resultSummary?: Record<string, unknown>;
      };

      if (!payload.action || !payload.jobId || !payload.status) {
        return Response.json(
          { error: 'Missing required fields: action, jobId, status' },
          { status: 400 }
        );
      }

      const jobService = container.get<JobService>(JobService);

      await jobService.updateJobStatus(
        payload.jobId,
        payload.status as JobStatus,
        payload.error,
        payload.resultSummary,
      );

      console.log('[Callback] Updated job status:', { jobId: payload.jobId, status: payload.status });
      return Response.json({ success: true });
    } catch (error) {
      console.error('[Callback] Error processing request:', error);
      return Response.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      );
    }
  });
};
