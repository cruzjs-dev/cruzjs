/**
 * Twilio Two-Factor Adapter
 *
 * Sends SMS OTP codes via the Twilio REST API using fetch (no SDK).
 * Email delivery is delegated to the existing email service.
 *
 * Required environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER (sender phone number)
 */

import type { TwoFactorAdapter } from '../two-factor.adapter';

export class TwilioTwoFactorAdapter implements TwoFactorAdapter {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string,
  ) {}

  async sendSMS(phoneNumber: string, code: string, _userId: string): Promise<void> {
    if (!this.accountSid || !this.authToken) {
      console.warn('[2FA] Twilio credentials not configured, skipping SMS delivery');
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const credentials = btoa(`${this.accountSid}:${this.authToken}`);

    const body = new URLSearchParams({
      To: phoneNumber,
      From: this.fromNumber,
      Body: `Your verification code is: ${code}. It expires in 5 minutes.`,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio SMS failed: ${response.status} ${error}`);
    }
  }

  async sendEmail(_email: string, _code: string, _userId: string): Promise<void> {
    // Email delivery should be handled by the existing EmailService.
    // This adapter focuses on SMS. If email 2FA is needed, use the
    // EmailTwoFactorAdapter or wire up email delivery in TwoFactorService.
    console.warn('[2FA] Email delivery not implemented in Twilio adapter. Use EmailTwoFactorAdapter.');
  }
}
