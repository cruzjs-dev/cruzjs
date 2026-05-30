import { getEnv } from '../shared/config';
import { EmailTemplateService, type EmailTemplate, type EmailTemplateData } from '../email/template.service';
import { handleCruzLoader } from '../routing';
import type { LoaderFunctionArgs } from 'react-router';

// Valid template names for validation
const VALID_TEMPLATES: EmailTemplate[] = [
  'welcome',
  'email-verification',
  'password-reset',
  'invitation',
  'subscription-confirmed',
  'subscription-canceled',
  'payment-failed',
];

function isValidTemplate(template: string): template is EmailTemplate {
  return VALID_TEMPLATES.includes(template as EmailTemplate);
}

/**
 * GET /api/email-preview?template=welcome
 * Preview email templates in development
 */
export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ request, container }) => {
    const env = getEnv();

    // Only allow in development
    if (env.NODE_ENV !== 'development') {
      return Response.json(
        { error: 'Not available in production' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const templateParam = url.searchParams.get('template');

    if (!templateParam) {
      return Response.json(
        { error: 'Template parameter required' },
        { status: 400 }
      );
    }

    if (!isValidTemplate(templateParam)) {
      return Response.json(
        { error: 'Invalid template' },
        { status: 400 }
      );
    }

    const template: EmailTemplate = templateParam;

    // Sample data for each template
    const sampleData: EmailTemplateData = {
      welcome: {
        name: 'John Doe',
        email: 'john@example.com',
        appUrl: 'http://localhost:3000',
      },
      'email-verification': {
        name: 'John Doe',
        verificationUrl: 'http://localhost:3000/auth/verify-email?token=abc123',
      },
      'password-reset': {
        name: 'John Doe',
        resetUrl: 'http://localhost:3000/auth/reset-password?token=abc123',
      },
      invitation: {
        inviterName: 'Jane Smith',
        organizationName: 'Acme Corp',
        role: 'MEMBER',
        acceptUrl: 'http://localhost:3000/invitations/abc123',
        declineUrl: 'http://localhost:3000/invitations/abc123/decline',
      },
      'subscription-confirmed': {
        organizationName: 'Acme Corp',
        planName: 'Pro Plan',
        billingUrl: 'http://localhost:3000/billing',
      },
      'subscription-canceled': {
        organizationName: 'Acme Corp',
        planName: 'Pro Plan',
        cancelDate: '2024-12-31',
        billingUrl: 'http://localhost:3000/billing',
      },
      'payment-failed': {
        organizationName: 'Acme Corp',
        planName: 'Pro Plan',
        amount: '$29.99',
        billingUrl: 'http://localhost:3000/billing',
      },
    };

    const data = sampleData[template];

    try {
      const emailTemplateService =
        container.get<EmailTemplateService>(EmailTemplateService);
      const { html, text } = await emailTemplateService.renderTemplate(
        template,
        data
      );
      const subject = emailTemplateService.getSubject(template);

      return Response.json({
        template,
        subject,
        html,
        text,
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to render template',
        },
        { status: 500 }
      );
    }
  });
