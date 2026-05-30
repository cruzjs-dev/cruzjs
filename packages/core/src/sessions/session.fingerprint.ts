/**
 * Session Fingerprinting Utilities
 *
 * Generate device fingerprints from request headers and parse
 * user agent strings into human-readable device labels.
 */

/**
 * Generate a device fingerprint from request headers.
 * Uses a combination of stable headers to create a consistent fingerprint
 * without relying on browser-side fingerprinting libraries.
 */
export async function generateDeviceFingerprint(headers: Headers): Promise<string> {
  const components = [
    headers.get('user-agent') ?? '',
    headers.get('accept-language') ?? '',
    headers.get('sec-ch-ua') ?? '',
    headers.get('sec-ch-ua-platform') ?? '',
    headers.get('sec-ch-ua-mobile') ?? '',
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(components);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse a user agent string into a human-readable device label.
 *
 * Examples:
 * - "Chrome on macOS"
 * - "Firefox on Windows"
 * - "Safari on iOS"
 * - "Mobile Safari on iOS"
 */
export function parseDeviceLabel(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('edg/') || ua.includes('edge/')) {
    browser = 'Edge';
  } else if (ua.includes('opr/') || ua.includes('opera')) {
    browser = 'Opera';
  } else if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = ua.includes('mobile') ? 'Chrome Mobile' : 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = ua.includes('mobile') ? 'Firefox Mobile' : 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipad')) ? 'Mobile Safari' : 'Safari';
  } else if (ua.includes('curl')) {
    browser = 'cURL';
  } else if (ua.includes('postman')) {
    browser = 'Postman';
  }

  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('mac os') || ua.includes('macintosh')) {
    os = 'macOS';
  } else if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('cros')) {
    os = 'ChromeOS';
  }

  return `${browser} on ${os}`;
}
