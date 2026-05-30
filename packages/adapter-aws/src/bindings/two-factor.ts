/**
 * AWS SNS Two-Factor Adapter
 *
 * Uses AWS SNS for SMS delivery. Falls back gracefully in dev.
 * Email delivery should be handled by AWS SES via the existing email service.
 *
 * Environment variables:
 * - AWS_REGION (defaults to us-east-1)
 * - AWS_ACCESS_KEY_ID (or use IAM role)
 * - AWS_SECRET_ACCESS_KEY (or use IAM role)
 *
 * Note: This is a placeholder that documents the interface contract.
 * Actual AWS SDK v3 integration should be added when deployed.
 */

import type { TwoFactorAdapter } from '@cruzjs/core/two-factor';

export class AWSSNSTwoFactorAdapter implements TwoFactorAdapter {
  constructor(private readonly region: string = 'us-east-1') {}

  async sendSMS(phoneNumber: string, code: string, _userId: string): Promise<void> {
    if (!this.region) {
      console.warn('[2FA] AWS region not configured, skipping SMS delivery');
      return;
    }

    // TODO: Replace with @aws-sdk/client-sns PublishCommand
    // const client = new SNSClient({ region: this.region });
    // await client.send(new PublishCommand({
    //   PhoneNumber: phoneNumber,
    //   Message: `Your verification code is: ${code}. It expires in 5 minutes.`,
    //   MessageAttributes: {
    //     'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
    //   },
    // }));

    console.warn(`[2FA] AWS SNS SMS stub: would send code to ${phoneNumber}`);
  }

  async sendEmail(_email: string, _code: string, _userId: string): Promise<void> {
    // Email delivery handled by AWS SES via EmailService
    console.warn('[2FA] Email delivery not implemented in AWS SNS adapter. Use EmailTwoFactorAdapter.');
  }
}
