---
title: Unit Tests
description: Testing services with mock DI containers, testing tRPC routers with mock context, test factories, and common test patterns.
---

Unit tests in CruzJS verify individual services, routers, and utilities in isolation. Use Vitest with mock dependencies injected through the DI container.

## Testing Services

Services are `@injectable()` classes that depend on other services via constructor injection. In tests, provide mock implementations:

```typescript
// src/features/projects/project.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockDb: any;

  beforeEach(() => {
    // Create a mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnValue([{
        id: 'proj-1',
        name: 'Test Project',
        orgId: 'org-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]),
    };

    // Instantiate the service with the mock
    service = new ProjectService(mockDb);
  });

  it('should create a project', async () => {
    const result = await service.createProject('org-1', {
      name: 'Test Project',
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('Test Project');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should return null for non-existent project', async () => {
    mockDb.limit.mockReturnValue([]);

    const result = await service.getProject('non-existent');
    expect(result).toBeNull();
  });
});
```

### Mock DI Container

For services with many dependencies, create a mock container:

```typescript
import { CruzContainer } from '@cruzjs/core/di';
import { DRIZZLE } from '@cruzjs/core/shared/database/drizzle.service';

function createTestContainer(overrides: Record<symbol | string, unknown> = {}) {
  const container = new CruzContainer();

  // Bind common mocks
  container.bind(DRIZZLE).toConstantValue(createMockDb());

  // Apply overrides
  for (const [token, value] of Object.entries(overrides)) {
    container.rebind(token).toConstantValue(value);
  }

  return container;
}

describe('OrgService', () => {
  it('should create an organization', async () => {
    const container = createTestContainer();
    const orgService = container.get(OrgService);

    const result = await orgService.createOrg(
      { name: 'Test Org' },
      'user-1'
    );

    expect(result.slug).toBe('test-org');
  });
});
```

## Testing tRPC Routers

Test tRPC routers by creating a mock context and calling procedures directly:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import { projectRouter } from './project.router';
import { CruzContainer } from '@cruzjs/core/di';

// Create a caller for testing
const createCaller = createCallerFactory(projectRouter);

describe('projectRouter', () => {
  function createMockContext(overrides: Partial<Context> = {}): Context {
    const container = new CruzContainer();

    // Register mock services
    container.bind(ProjectService).toConstantValue({
      create: vi.fn().mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        orgId: 'org-1',
      }),
      list: vi.fn().mockResolvedValue([]),
    } as any);

    return {
      request: new Request('http://localhost'),
      session: {
        user: { id: 'user-1' },
      },
      org: {
        user: { id: 'user-1' },
        org: { orgId: 'org-1', userId: 'user-1', role: 'OWNER' as const },
      },
      container,
      ...overrides,
    };
  }

  it('should create a project', async () => {
    const ctx = createMockContext();
    const caller = createCaller(ctx);

    const result = await caller.create({ name: 'Test Project' });

    expect(result.id).toBe('proj-1');
    expect(result.name).toBe('Test Project');
  });

  it('should require authentication', async () => {
    const ctx = createMockContext({ session: null });
    const caller = createCaller(ctx);

    await expect(caller.create({ name: 'Test' }))
      .rejects.toThrow('Authentication required');
  });

  it('should require org context', async () => {
    const ctx = createMockContext({ org: null });
    const caller = createCaller(ctx);

    await expect(caller.create({ name: 'Test' }))
      .rejects.toThrow('Organization context required');
  });
});
```

## Test Factories

Create reusable factories for generating test data:

```typescript
// tests/factories/user.factory.ts
import { createId } from '@paralleldrive/cuid2';

type UserOverrides = Partial<{
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}>;

export function createTestUser(overrides: UserOverrides = {}) {
  const id = overrides.id ?? createId();
  return {
    id,
    email: overrides.email ?? `user-${id}@test.com`,
    name: overrides.name ?? `Test User ${id.slice(0, 4)}`,
    emailVerified: overrides.emailVerified ? new Date().toISOString() : null,
    password: null,
    isBanned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
```

```typescript
// tests/factories/org.factory.ts
import { createId } from '@paralleldrive/cuid2';

type OrgOverrides = Partial<{
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}>;

export function createTestOrg(overrides: OrgOverrides = {}) {
  const id = overrides.id ?? createId();
  return {
    id,
    name: overrides.name ?? `Test Org ${id.slice(0, 4)}`,
    slug: overrides.slug ?? `test-org-${id.slice(0, 4)}`,
    ownerId: overrides.ownerId ?? createId(),
    avatarUrl: null,
    stripeCustomerId: null,
    settings: '{}',
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
```

Use factories in tests:

```typescript
import { createTestUser } from 'tests/factories/user.factory';
import { createTestOrg } from 'tests/factories/org.factory';

describe('MemberService', () => {
  it('should add a member', async () => {
    const user = createTestUser({ email: 'john@example.com' });
    const org = createTestOrg({ name: 'Acme Corp' });

    // Insert test data into mock db...
    const member = await memberService.addMember(org.id, user.id, 'MEMBER');

    expect(member.role).toBe('MEMBER');
  });
});
```

## Common Test Patterns

### Testing Validation

```typescript
import { createOrgSchema } from './org.validation';

describe('org validation', () => {
  it('should require a name', () => {
    const result = createOrgSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept valid input', () => {
    const result = createOrgSchema.safeParse({ name: 'Acme Corp' });
    expect(result.success).toBe(true);
  });

  it('should reject names that are too short', () => {
    const result = createOrgSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });
});
```

### Testing Error Cases

```typescript
describe('ProjectService', () => {
  it('should throw when project not found', async () => {
    mockDb.limit.mockReturnValue([]);

    await expect(service.updateProject('non-existent', { name: 'New Name' }))
      .rejects.toThrow('Project not found');
  });

  it('should prevent removing the last owner', async () => {
    // Mock: only one owner exists
    mockDb.where.mockReturnValue([{ role: 'OWNER', userId: 'user-1' }]);

    await expect(memberService.removeMember('org-1', 'user-1'))
      .rejects.toThrow('Cannot remove the last owner');
  });
});
```

### Testing Event Emission

```typescript
import { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';

describe('AuthService', () => {
  it('should emit UserRegisteredEvent on registration', async () => {
    const emitSpy = vi.spyOn(eventEmitter, 'dispatch');

    await authService.register({
      email: 'new@example.com',
      password: 'secure-password',
    });

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'UserRegisteredEvent',
      })
    );
  });
});
```

### Snapshot Testing

```typescript
describe('slug generation', () => {
  it('should generate consistent slugs', () => {
    expect(generateSlug('Acme Corporation')).toMatchInlineSnapshot('"acme-corporation"');
    expect(generateSlug('My Band!!')).toMatchInlineSnapshot('"my-band"');
    expect(generateSlug('  Spaces  Everywhere  ')).toMatchInlineSnapshot('"spaces-everywhere"');
  });
});
```

## Next Steps

- [E2E Tests](/testing/e2e-tests) -- Browser-based testing
- [Database Tests](/testing/database-tests) -- Testing with real queries
- [Testing Overview](/testing/getting-started) -- Configuration and CLI
