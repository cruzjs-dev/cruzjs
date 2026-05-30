/**
 * Magic Link Email Template
 *
 * Builds the subject, HTML, and plain text for a magic link email.
 */

export type MagicLinkEmailOptions = {
  email: string;
  magicLinkUrl: string;
  expiryMinutes: number;
  appName: string;
};

export function buildMagicLinkEmail(options: MagicLinkEmailOptions): {
  subject: string;
  html: string;
  text: string;
} {
  const { email, magicLinkUrl, expiryMinutes, appName } = options;

  const subject = `Sign in to ${appName}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 40px; max-width: 600px;">
          <tr>
            <td>
              <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">Sign in to ${appName}</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
                We received a sign-in request for <strong>${email}</strong>.
              </p>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                Click the button below to sign in. This link expires in ${expiryMinutes} minutes.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="background-color: #0070f3; border-radius: 6px; padding: 12px 24px;">
                    <a href="${magicLinkUrl}" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                      Sign In
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #6a6a6a; font-size: 14px; line-height: 20px; margin: 0 0 8px 0;">
                If the button does not work, copy and paste this URL into your browser:
              </p>
              <p style="color: #0070f3; font-size: 14px; line-height: 20px; word-break: break-all; margin: 0 0 24px 0;">
                ${magicLinkUrl}
              </p>
              <hr style="border: none; border-top: 1px solid #eaeaea; margin: 24px 0;" />
              <p style="color: #999999; font-size: 12px; line-height: 18px; margin: 0;">
                If you did not request this email, you can safely ignore it.
                This link will expire in ${expiryMinutes} minutes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Sign in to ${appName}

We received a sign-in request for ${email}.

Click the link below to sign in. This link expires in ${expiryMinutes} minutes.

${magicLinkUrl}

If you did not request this email, you can safely ignore it.`;

  return { subject, html, text };
}
