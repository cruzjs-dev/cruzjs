import { HealthCheckService } from '../health/health-check.service';
import {
  handleCruzLoader,
  handleCruzAction,
  type LoaderFunctionArgsWithContainer,
} from '../routing';
import { CloudflareContext } from '../shared/cloudflare/context';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers
 */
export const loader = async (args: LoaderFunctionArgs) => {
  await CloudflareContext.init(args.context);

  return handleCruzLoader([args], async ({ request, container }: LoaderFunctionArgsWithContainer) => {
    try {
      const healthService = container.get<HealthCheckService>(HealthCheckService);
      const health = await healthService.checkHealth();

      return Response.json(health, {
        status: health.status === 'healthy' ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error) {
      return Response.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  });
};

export const action = async (args: ActionFunctionArgs) => {
  await CloudflareContext.init(args.context);

  return handleCruzAction([args], async ({ request, container }) => {
    const healthService = container.get<HealthCheckService>(HealthCheckService);
    const health = await healthService.checkHealth();

    return Response.json(health, {
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  });
};
