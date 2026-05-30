import { describe, it, expect } from 'vitest';
import { McpNoAuth, McpSessionAuth } from '../auth/mcp-auth';

describe('McpNoAuth', () => {
  it('always returns authenticated: true', async () => {
    const auth = new McpNoAuth();
    const result = await auth.validate(new Request('http://localhost'));
    expect(result).toEqual({ authenticated: true });
  });
});

describe('McpSessionAuth', () => {
  // ─── Token Extraction ─────────────────────────────────────────

  it('returns authenticated: false when no Authorization header', async () => {
    const mockSessionService = { getSession: vi.fn() };
    const auth = new McpSessionAuth(mockSessionService as any);
    const result = await auth.validate(new Request('http://localhost'));
    expect(result).toEqual({ authenticated: false });
    expect(mockSessionService.getSession).not.toHaveBeenCalled();
  });

  it('extracts Bearer token and calls getSession', async () => {
    const mockSessionService = {
      getSession: vi.fn().mockResolvedValue({ userId: 'user-1' }),
    };
    const auth = new McpSessionAuth(mockSessionService as any);
    const request = new Request('http://localhost', {
      headers: { authorization: 'Bearer test-token-123' },
    });

    const result = await auth.validate(request);
    expect(mockSessionService.getSession).toHaveBeenCalledWith('test-token-123');
    expect(result).toEqual({
      authenticated: true,
      userId: 'user-1',
      scopes: [],
      roles: [],
    });
  });

  it('returns authenticated: false when session not found', async () => {
    const mockSessionService = {
      getSession: vi.fn().mockResolvedValue(null),
    };
    const auth = new McpSessionAuth(mockSessionService as any);
    const request = new Request('http://localhost', {
      headers: { authorization: 'Bearer invalid-token' },
    });

    const result = await auth.validate(request);
    expect(result).toEqual({ authenticated: false });
  });

  it('returns authenticated: false when getSession throws', async () => {
    const mockSessionService = {
      getSession: vi.fn().mockRejectedValue(new Error('db error')),
    };
    const auth = new McpSessionAuth(mockSessionService as any);
    const request = new Request('http://localhost', {
      headers: { authorization: 'Bearer some-token' },
    });

    const result = await auth.validate(request);
    expect(result).toEqual({ authenticated: false });
  });
});
