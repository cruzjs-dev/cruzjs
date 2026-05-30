import { EmailLogService } from '../email/email-log.service';
import { handleCruzLoader } from '../routing';
import type { LoaderFunctionArgs } from 'react-router';
import { getEnv } from '../shared/config';

/**
 * GET /api/email-logs?to=email@example.com&template=password-reset&limit=10
 * Get email logs for testing purposes (development only)
 */
export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ request, container }) => {
    const env = getEnv();

    // Only allow in development/test environments
    if (env.NODE_ENV === 'production') {
      return Response.json({ error: 'Not available in production' }, { status: 403 });
    }

    const url = new URL(request.url);
    const to = url.searchParams.get('to');
    const template = url.searchParams.get('template') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    if (!to) {
      return Response.json({ error: 'to parameter is required' }, { status: 400 });
    }

    try {
      const emailLogService = container.get<EmailLogService>(EmailLogService);
      const logs = await emailLogService.getLogsByRecipient(to, limit);

      // Filter by template if provided
      const filteredLogs = template
        ? logs.filter((log: any) => log.template === template)
        : logs;

      return Response.json({
        logs: filteredLogs.map((log: any) => ({
          id: log.id,
          to: log.to,
          subject: log.subject,
          template: log.template,
          metadata: log.metadata,
          status: log.status,
          createdAt: log.createdAt,
        })),
      });
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Failed to get email logs',
        },
        { status: 500 }
      );
    }
  });
