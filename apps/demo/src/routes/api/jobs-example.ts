import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { handleCruzLoader, handleCruzAction } from '@cruzjs/core/routing';
import { JobService } from '@cruzjs/core/jobs/job.service';

/**
 * GET /api/jobs-example?jobId=xxx
 * Check job status. Without jobId, returns recent job counts.
 */
export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ request, container }) => {
    const jobService = container.get<JobService>(JobService);

    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (jobId) {
      const job = await jobService.getJob(jobId);
      if (!job) {
        return Response.json({ error: 'Job not found' }, { status: 404 });
      }

      let resultSummary = null;
      if (job.resultSummary) {
        try {
          resultSummary = typeof job.resultSummary === 'string'
            ? JSON.parse(job.resultSummary)
            : job.resultSummary;
        } catch { /* ignore */ }
      }

      return Response.json({
        id: job.id,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        error: job.error,
        resultSummary,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      });
    }

    const counts = await jobService.getJobCounts();
    return Response.json({ counts });
  });

/**
 * POST /api/jobs-example
 * Dispatch a hello-world job. Body: { name: "..." }
 */
export const action = async (args: ActionFunctionArgs) =>
  handleCruzAction([args], async ({ request, container }) => {
    const jobService = container.get<JobService>(JobService);

    const body = await request.json().catch(() => ({})) as { name?: string };

    const job = await jobService.createJob({
      type: 'hello-world',
      payload: { name: body.name ?? 'World' },
      priority: 'NORMAL',
    });

    return Response.json({
      message: 'Job dispatched',
      jobId: job.id,
      checkStatus: `/api/jobs-example?jobId=${job.id}`,
    });
  });
