/**
 * Email Two-Factor Adapter
 *
 * Sends OTP codes via the existing EmailService infrastructure.
 * SMS delivery is not supported — combine with a Twilio adapter for that.
 */

import type { TwoFactorAdapter } from '../two-factor.adapter';

type EmailServiceLike = {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
};

export class EmailTwoFactorAdapter implements TwoFactorAdapter {
  constructor(
    private readonly emailService: EmailServiceLike,
    private readonly appName: string = 'CruzJS',
  ) {}

  async sendSMS(_phoneNumber: string, _code: string, _userId: string): Promise<void> {
    // SMS delivery not supported by email adapter
    console.warn('[2FA] SMS delivery not supported by EmailTwoFactorAdapter. Use a dedicated SMS adapter.');
  }

  async sendEmail(email: string, code: string, _userId: string): Promise<void> {
    const subject = `Your ${this.appName} verification code`;
    const html = `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2>Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center; margin: 16px 0;">
          ${code}
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await this.emailService.sendEmail(email, subject, html);
  }
}
