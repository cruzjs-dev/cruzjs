import type { SessionService } from '@cruzjs/core/auth/session.service';
import type { McpAuthResult } from '../core/types';

export interface IMcpAuth {
  validate(request: Request): Promise<McpAuthResult>;
}

export class McpNoAuth implements IMcpAuth {
  async validate(_request: Request): Promise<McpAuthResult> {
    return { authenticated: true };
  }
}

export class McpSessionAuth implements IMcpAuth {
  constructor(private sessionService: SessionService) {}

  async validate(request: Request): Promise<McpAuthResult> {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return { authenticated: false };
    }

    try {
      const session = await this.sessionService.getSession(token);
      if (!session) {
        return { authenticated: false };
      }
      return {
        authenticated: true,
        userId: session.userId,
        scopes: [],
        roles: [],
      };
    } catch {
      return { authenticated: false };
    }
  }
}
