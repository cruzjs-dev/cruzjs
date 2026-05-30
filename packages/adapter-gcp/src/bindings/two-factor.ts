/**
 * GCP Twilio Two-Factor Adapter
 *
 * Uses Twilio REST API for SMS delivery on Google Cloud.
 * Email delivery is handled by the existing email infrastructure.
 *
 * Environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */

import { TwilioTwoFactorAdapter } from '@cruzjs/core/two-factor';

export class GCPTwilioTwoFactorAdapter extends TwilioTwoFactorAdapter {
  constructor(env: Record<string, string | undefined>) {
    super(
      env.TWILIO_ACCOUNT_SID ?? '',
      env.TWILIO_AUTH_TOKEN ?? '',
      env.TWILIO_PHONE_NUMBER ?? '',
    );
  }
}
