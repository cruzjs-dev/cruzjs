/**
 * Helmet security headers service
 * Note: Helmet is Express middleware, but we apply headers manually in React Router
 */
export class HelmetService {
  /**
   * Apply security headers to response
   * For use in React Router loaders/actions
   */
  static applySecurityHeaders(response: Response): void {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
}
