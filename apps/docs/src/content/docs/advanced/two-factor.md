---
title: Two-Factor Authentication
description: TOTP authenticator app and SMS-based 2FA with trusted devices and backup codes in CruzJS
---

CruzJS supports two-factor authentication (2FA) via TOTP authenticator apps (Google Authenticator, Authy) and SMS. The system includes trusted device management and backup codes for account recovery.

## Setup

Register the `TwoFactorModule` in your application:

```typescript
import { TwoFactorModule } from '@cruzjs/core/two-factor';

export default createCruzApp({
  modules: [TwoFactorModule],
});
```

## Methods

| Method | How It Works | Requirement |
|--------|-------------|-------------|
| **TOTP** | Time-based one-time passwords via authenticator app | None (built-in) |
| **SMS** | One-time code sent via text message | Twilio account |

## TOTP Setup Flow

### 1. Generate Setup Data

Call `twoFactor.setupTOTP` to generate a secret and QR code URI:

```typescript
const { data } = trpc.twoFactor.setupTOTP.useMutation();
// data: { secret, qrCodeUri, backupCodes }
```

### 2. Display QR Code

Show the QR code for the user to scan with their authenticator app:

```typescript
function TwoFactorSetup() {
  const setup = trpc.twoFactor.setupTOTP.useMutation();

  return (
    <div>
      <button onClick={() => setup.mutate()}>Enable 2FA</button>
      {setup.data && (
        <div>
          <QRCode value={setup.data.qrCodeUri} />
          <p>Or enter this code manually: {setup.data.secret}</p>
        </div>
      )}
    </div>
  );
}
```

### 3. Verify and Activate

After scanning, the user enters a code from their authenticator app to confirm setup:

```typescript
trpc.twoFactor.verifyTOTP.useMutation().mutate({
  code: '123456',
});
```

Once verified, 2FA is active on the account.

## Checking 2FA Status

```typescript
const { data: status } = trpc.twoFactor.getStatus.useQuery();
// status: { enabled: true, method: 'totp', trustedDevices: [...] }
```

## Login with 2FA

When a user with 2FA enabled logs in, the login flow returns a `requiresTwoFactor: true` flag instead of a session token. The user must then provide a TOTP code or backup code to complete authentication.

## Backup Codes

Backup codes are single-use recovery codes generated during 2FA setup. They allow access if the user loses their authenticator device.

```typescript
const { data } = trpc.twoFactor.generateBackupCodes.useMutation();
// data: { codes: ['abc123', 'def456', 'ghi789', ...] }
```

:::caution
Backup codes should be displayed once and stored securely by the user. They cannot be retrieved after the initial generation.
:::

Generate new backup codes at any time (invalidates previous codes):

```typescript
trpc.twoFactor.generateBackupCodes.useMutation().mutate();
```

## Trusted Devices

Users can mark a device as trusted to skip 2FA for 30 days. Trusted device tokens are stored in a cookie.

### List Trusted Devices

```typescript
const { data } = trpc.twoFactor.listTrustedDevices.useQuery();
// data: [{ id, name, lastUsed, expiresAt }, ...]
```

### Remove a Trusted Device

```typescript
trpc.twoFactor.removeTrustedDevice.useMutation().mutate({
  deviceId: 'device_abc123',
});
```

## Disabling 2FA

Disabling requires a current TOTP code or a valid backup code to confirm identity:

```typescript
trpc.twoFactor.disable.useMutation().mutate({
  code: '123456', // TOTP code or backup code
});
```

## SMS-Based 2FA

SMS 2FA sends a one-time code via text message instead of using an authenticator app.

### Twilio Configuration

Set the following environment variables:

```bash
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15551234567
```

### Platform Adapters

| Platform | Adapter |
|----------|---------|
| Cloudflare | `CloudflareTwilioTwoFactorAdapter` |
| Docker / Containers | `TwilioTwoFactorAdapter` |

The adapter is selected automatically based on your runtime adapter.

### Setup Flow

```typescript
// 1. Enable SMS 2FA with phone number
trpc.twoFactor.setupSMS.useMutation().mutate({
  phoneNumber: '+15559876543',
});

// 2. Verify the code sent via SMS
trpc.twoFactor.verifySMS.useMutation().mutate({
  code: '123456',
});
```

## tRPC Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `twoFactor.getStatus` | query | Get current 2FA status and trusted devices |
| `twoFactor.setupTOTP` | mutation | Generate TOTP secret and QR code URI |
| `twoFactor.verifyTOTP` | mutation | Verify a TOTP code to activate 2FA |
| `twoFactor.setupSMS` | mutation | Start SMS 2FA setup with phone number |
| `twoFactor.verifySMS` | mutation | Verify SMS code to activate 2FA |
| `twoFactor.generateBackupCodes` | mutation | Generate new backup codes |
| `twoFactor.listTrustedDevices` | query | List trusted devices |
| `twoFactor.removeTrustedDevice` | mutation | Remove a trusted device |
| `twoFactor.disable` | mutation | Disable 2FA (requires code) |
