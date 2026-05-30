import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';
import { requireOrgContext } from '@cruzjs/core/shared/middleware/org-context.middleware';
import { requirePermission } from '@cruzjs/core/shared/middleware/permission.middleware';
import { CustomerPortalService } from '../billing/customer-portal.service';
import { handleCruzAction } from '@cruzjs/core/routing';
import { z } from 'zod';
import type { ActionFunctionArgs } from 'react-router';

const createPortalSessionSchema = z.object({
  organizationId: z.string(),
  returnUrl: z.string().url(),
});

/**
 * POST /api/billing/create-portal-session
 * Create Stripe customer portal session
 */
export const action = async (args: ActionFunctionArgs) =>
  handleCruzAction([args], async ({ request, container }) => {
    try {
      const auth = await requireSession(request, container);
      const body = await request.json();
      const validated = createPortalSessionSchema.parse(body);

      // Verify user has access to this organization
      const orgContext = await requireOrgContext(
        request,
        { id: validated.organizationId },
        auth,
        container
      );

      // Check billing:write permission
      await requirePermission(orgContext, 'billing:write', container);

      const customerPortalService = container.get<CustomerPortalService>(CustomerPortalService);
      const portalUrl = await customerPortalService.createPortalSession(
        validated.organizationId,
        validated.returnUrl
      );

      return Response.json({
        url: portalUrl,
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      if (error instanceof z.ZodError) {
        return Response.json(
          { error: error.issues[0].message },
          { status: 400 }
        );
      }
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Failed to create portal session',
        },
        { status: 500 }
      );
    }
  });
