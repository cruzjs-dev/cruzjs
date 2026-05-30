/**
 * @cruzjs/core Two-Factor Authentication
 *
 * TOTP-based 2FA with backup codes, trusted devices, and
 * optional SMS/email OTP via adapter pattern.
 */

// Types
export {
  TwoFactorMethod,
  TWO_FACTOR_ADAPTER,
} from './two-factor.types';
export type {
  TwoFactorSecret,
  TrustedDevice,
  BackupCode,
  TOTPSetupResult,
  TwoFactorStatus,
} from './two-factor.types';

// Adapter interface
export type { TwoFactorAdapter } from './two-factor.adapter';

// Schema
export {
  twoFactorSecrets,
  trustedDevices,
} from './two-factor.schema';
export type {
  TwoFactorSecretRow,
  NewTwoFactorSecret,
  TrustedDeviceRow,
  NewTrustedDevice,
} from './two-factor.schema';

// TOTP Provider
export { TOTPProvider, base32Encode, base32Decode, timingSafeEqual } from './totp.provider';

// Service
export { TwoFactorService } from './two-factor.service';

// tRPC Router
export { TwoFactorTrpc } from './two-factor.trpc';

// Enforcement middleware
export { twoFactorMiddleware } from './two-factor.enforcement';
export type { TwoFactorPolicy } from './two-factor.enforcement';

// Validation
export {
  verifySetupSchema,
  disableSchema,
  verifyCodeSchema,
  revokeTrustedDeviceSchema,
  trustDeviceSchema,
  sendOTPSchema,
} from './two-factor.validation';
export type {
  VerifySetupInput,
  DisableInput,
  VerifyCodeInput,
  RevokeTrustedDeviceInput,
  TrustDeviceInput,
  SendOTPInput,
} from './two-factor.validation';

// Adapters
export { TwilioTwoFactorAdapter } from './adapters/twilio.two-factor.adapter';
export { EmailTwoFactorAdapter } from './adapters/email.two-factor.adapter';

// Module
export { TwoFactorModule } from './two-factor.module';
