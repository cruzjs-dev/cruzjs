import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';
import { BillingService } from '../billing/billing.service';
import { handleCruzLoader } from '@cruzjs/core/routing';
import type { LoaderFunctionArgs } from 'react-router';

/**
 * GET /api/billing/plans
 * Get all available billing plans
 */
export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ request, container }) => {
    try {
      await requireSession(request, container);

      const billingService = container.get<BillingService>(BillingService);
      const plans = await billingService.getPlans();

      return Response.json({
        plans,
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Failed to get plans',
        },
        { status: 500 }
      );
    }
  });
