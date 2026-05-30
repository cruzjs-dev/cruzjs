/**
 * Two-Factor Authentication Adapter
 *
 * Provider-agnostic interface for sending 2FA OTP codes via SMS or email.
 * Implementations may use Twilio, AWS SNS, Azure Communication Services, etc.
 */

export interface TwoFactorAdapter {
  /** Send a 2FA OTP code via SMS */
  sendSMS(phoneNumber: string, code: string, userId: string): Promise<void>;

  /** Send a 2FA OTP code via email */
  sendEmail(email: string, code: string, userId: string): Promise<void>;
}
