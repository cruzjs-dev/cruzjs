/**
 * Test Context Factory
 *
 * Builds a mock tRPC context with sensible defaults for testing procedures
 * without an HTTP request.
 *
 * @example
 * ```typescript
 * import { createTestContext } from '@cruzjs/core/testing';
 *
 * const ctx = createTestContext();
 * // ctx.session.user.id === 'user_test_123'
 * // ctx.org.orgId === 'org_test_123'
 *
 * const ctx2 = createTestContext({ session: null }); // unauthenticated
 * ```
 */

import type { Context } from '../trpc/context';
import type { CruzContainer } from '../di';
import { createTestContainer } from './test-container';

export interface TestContextOverrides {
  request?: Request;
  session?: Context['session'] | null;
  org?: Context['org'] | null;
  container?: CruzContainer;
}

const DEFAULT_SESSION: NonNullable<Context['session']> = {
  user: {
    id: 'user_test_123',
  },
  session: {
    token: 'test_session_token_abc',
    userId: 'user_test_123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
  },
} as NonNullable<Context['session']>;

const DEFAULT_ORG: NonNullable<Context['org']> = {
  user: {
    id: 'user_test_123',
  },
  session: {
    token: 'test_session_token_abc',
    userId: 'user_test_123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  org: {
    orgId: 'org_test_123',
    userId: 'user_test_123',
    role: 'ADMIN',
  },
} as NonNullable<Context['org']>;

/**
 * Create a mock tRPC context for testing.
 *
 * All fields have sensible defaults:
 * - session: authenticated user with id 'user_test_123'
 * - org: admin of org 'org_test_123'
 * - container: empty test container
 * - request: minimal GET Request to http://localhost/test
 *
 * Pass overrides to customize any field. Set `session: null` or `org: null`
 * to simulate unauthenticated or non-org contexts.
 *
 * @param overrides - Partial context overrides
 * @returns A complete tRPC Context suitable for calling procedures
 */
export function createTestContext(overrides: TestContextOverrides = {}): Context {
  const container = overrides.container ?? createTestContainer();

  return {
    request: overrides.request ?? new Request('http://localhost/test'),
    session: overrides.session === null
      ? null
      : (overrides.session ?? DEFAULT_SESSION),
    org: overrides.org === null
      ? null
      : (overrides.org ?? DEFAULT_ORG),
    container,
  };
}
