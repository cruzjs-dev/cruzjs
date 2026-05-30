/**
 * SMS Adapter Interface
 *
 * Abstract provider interface for sending SMS messages.
 * Implementations can wrap Twilio, AWS SNS, Vonage, etc.
 *
 * Bind an implementation via DI:
 * ```typescript
 * @Module({
 *   providers: [
 *     { provide: SMS_ADAPTER, useClass: TwilioSmsAdapter },
 *   ],
 * })
 * ```
 */

export interface SmsAdapter {
  /** Send an SMS message to a phone number (E.164 format). */
  send(to: string, body: string): Promise<void>;
}

export const SMS_ADAPTER = Symbol.for('SMS_ADAPTER');
