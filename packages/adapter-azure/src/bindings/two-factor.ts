/**
 * Azure Communication Services Two-Factor Adapter
 *
 * Uses Azure Communication Services for SMS delivery.
 * Falls back gracefully in dev when not configured.
 *
 * Environment variables:
 * - AZURE_COMMUNICATION_CONNECTION_STRING
 * - AZURE_COMMUNICATION_SENDER_PHONE
 *
 * Note: This is a placeholder that documents the interface contract.
 * Actual @azure/communication-sms integration should be added when deployed.
 */

import type { TwoFactorAdapter } from '@cruzjs/core/two-factor';

export class AzureCommServicesTwoFactorAdapter implements TwoFactorAdapter {
  constructor(
    private readonly connectionString: string = '',
    private readonly senderPhone: string = '',
  ) {}

  async sendSMS(phoneNumber: string, code: string, _userId: string): Promise<void> {
    if (!this.connectionString) {
      console.warn('[2FA] Azure Communication Services not configured, skipping SMS delivery');
      return;
    }

    // TODO: Replace with @azure/communication-sms SmsClient
    // const client = new SmsClient(this.connectionString);
    // await client.send({
    //   from: this.senderPhone,
    //   to: [phoneNumber],
    //   message: `Your verification code is: ${code}. It expires in 5 minutes.`,
    // });

    console.warn(`[2FA] Azure Communication Services SMS stub: would send code to ${phoneNumber}`);
  }

  async sendEmail(_email: string, _code: string, _userId: string): Promise<void> {
    // Email delivery handled by existing EmailService
    console.warn('[2FA] Email delivery not implemented in Azure adapter. Use EmailTwoFactorAdapter.');
  }
}
