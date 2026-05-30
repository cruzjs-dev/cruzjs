/**
 * Billing E2E Tests
 *
 * Tests billing endpoints via tRPC and webhook API.
 * NOTE: These tests require a running dev server and Stripe test mode keys.
 * The webhook tests simulate Stripe webhook payloads with valid signatures.
 */

import { test, expect } from '@playwright/test';

test.describe('Billing', () => {
  test.describe('Plans', () => {
    test('GET /api/trpc/billing.getPlans returns plans list', async ({ request }) => {
      const response = await request.get('/api/trpc/billing.getPlans');
      // May return empty if no plans seeded, but should not error
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Subscription', () => {
    test('billing.getSubscription returns null when no subscription', async ({ request }) => {
      // This requires an authenticated org context -- may 401 without auth
      const response = await request.get('/api/trpc/billing.getSubscription');
      // Expect either success (null result) or auth error, not a 500
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Webhook', () => {
    test('POST /api/billing/webhook returns 400 without signature', async ({ request }) => {
      const response = await request.post('/api/billing/webhook', {
        data: JSON.stringify({ type: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('stripe-signature');
    });

    test('POST /api/billing/webhook returns 400 with invalid signature', async ({ request }) => {
      const response = await request.post('/api/billing/webhook', {
        data: JSON.stringify({ type: 'test', data: { object: {} } }),
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=12345,v1=invalidsignature',
        },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('signature');
    });

    test('POST /api/billing/webhook accepts valid signed payload', async ({ request }) => {
      // Build a valid Stripe signature using Web Crypto API
      const payload = JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            subscription: 'sub_test_123',
            customer: 'cus_test_123',
            metadata: { orgId: 'test-org', planId: 'test-plan' },
          },
        },
      });

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        test.skip();
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payload}`;
      const encoder = new TextEncoder();

      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );

      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
      const bytes = new Uint8Array(sig);
      let hex = '';
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }

      const response = await request.post('/api/billing/webhook', {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': `t=${timestamp},v1=${hex}`,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });
  });

  test.describe('Entitlements', () => {
    test('billing.checkFeature returns boolean', async ({ request }) => {
      // Requires auth + org context
      const response = await request.get(
        '/api/trpc/billing.checkFeature?input=' +
          encodeURIComponent(JSON.stringify({ feature: 'api_access' })),
      );
      // Expect auth error or valid boolean result, not 500
      expect(response.status()).toBeLessThan(500);
    });

    test('billing.getLimits returns record', async ({ request }) => {
      const response = await request.get('/api/trpc/billing.getLimits');
      expect(response.status()).toBeLessThan(500);
    });
  });
});
