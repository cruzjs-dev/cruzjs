import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';
import { requireOrgContext } from '@cruzjs/core/shared/middleware/org-context.middleware';
import { requirePermission } from '@cruzjs/core/shared/middleware/permission.middleware';
import { BillingService } from '../billing/billing.service';
import { handleCruzLoader } from '@cruzjs/core/routing';
import type { LoaderFunctionArgs } from 'react-router';

/**
 * GET /api/billing/subscription
 * Get subscription for an organization
 */
export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ request, container }) => {
    try {
      const auth = await requireSession(request, container);
      const url = new URL(request.url);
      const organizationId = url.searchParams.get('organizationId');

      if (!organizationId) {
        return Response.json(
          { error: 'Organization ID is required' },
          { status: 400 }
        );
      }

      // Verify user has access to this organization
      const orgContext = await requireOrgContext(request, { id: organizationId }, auth, container);

      // Check billing:read permission
      await requirePermission(orgContext, 'billing:read', container);

      const billingService = container.get<BillingService>(BillingService);
      const subscription = await billingService.getSubscription(organizationId);

      return Response.json({
        subscription,
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Failed to get subscription',
        },
        { status: 500 }
      );
    }
  });
