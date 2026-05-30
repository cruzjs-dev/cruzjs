import type { EmailTemplate, EmailTemplateData } from './template.service';

export const previewSamples: { [K in EmailTemplate]: EmailTemplateData[K] } = {
  welcome: {
    name: 'Jane Smith',
    email: 'jane@example.com',
    appUrl: 'http://localhost:5173',
  },
  'email-verification': {
    name: 'Jane Smith',
    verificationUrl: 'http://localhost:5173/auth/verify?token=preview-token-123',
  },
  'password-reset': {
    name: 'Jane Smith',
    resetUrl: 'http://localhost:5173/auth/reset-password?token=preview-token-123',
  },
  invitation: {
    inviterName: 'John Doe',
    organizationName: 'Acme Corp',
    role: 'Member',
    acceptUrl: 'http://localhost:5173/invitations/accept/preview-token',
    declineUrl: 'http://localhost:5173/invitations/decline/preview-token',
  },
  'subscription-confirmed': {
    organizationName: 'Acme Corp',
    planName: 'Pro',
    billingUrl: 'http://localhost:5173/settings/billing',
  },
  'subscription-canceled': {
    organizationName: 'Acme Corp',
    planName: 'Pro',
    cancelDate: 'January 1, 2026',
    billingUrl: 'http://localhost:5173/settings/billing',
  },
  'payment-failed': {
    organizationName: 'Acme Corp',
    planName: 'Pro',
    amount: '$49.00',
    billingUrl: 'http://localhost:5173/settings/billing',
  },
};

export const allTemplateNames = Object.keys(previewSamples) as EmailTemplate[];
