import crypto from 'crypto';

/**
 * CSRF protection service
 */
export class CSRFService {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate CSRF token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify CSRF token
   */
  verifyToken(token: string, sessionToken: string): boolean {
    if (!token || !sessionToken) {
      return false;
    }

    // Simple token comparison (in production, use signed tokens)
    return token === sessionToken;
  }

  /**
   * Get CSRF token from request header
   */
  getTokenFromHeader(request: Request): string | null {
    return request.headers.get('X-CSRF-Token') || null;
  }

  /**
   * Get CSRF token from request body
   */
  getTokenFromBody(body: any): string | null {
    return body?._csrf || null;
  }
}

