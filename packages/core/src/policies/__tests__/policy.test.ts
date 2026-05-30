import { describe, it, expect } from 'vitest';
import { definePolicy, enforce, can, cannot, buildPolicyContext } from '../policy';
import type { PolicyContext, ResourcePolicy } from '../policy';

// ─── Test fixtures ───────────────────────────────────────────────────────────

interface Post {
  id: string;
  authorId: string;
  published: boolean;
  orgId: string;
}

const ownerCtx: PolicyContext = {
  user: { id: 'user-1' },
  org: { orgId: 'org-1', role: 'OWNER' },
};

const adminCtx: PolicyContext = {
  user: { id: 'user-2' },
  org: { orgId: 'org-1', role: 'ADMIN' },
};

const memberCtx: PolicyContext = {
  user: { id: 'user-3' },
  org: { orgId: 'org-1', role: 'MEMBER' },
};

const noOrgCtx: PolicyContext = {
  user: { id: 'user-1' },
};

const publishedPost: Post = {
  id: 'post-1',
  authorId: 'user-1',
  published: true,
  orgId: 'org-1',
};

const draftPost: Post = {
  id: 'post-2',
  authorId: 'user-1',
  published: false,
  orgId: 'org-1',
};

const otherUserDraft: Post = {
  id: 'post-3',
  authorId: 'user-99',
  published: false,
  orgId: 'org-1',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('definePolicy', () => {
  it('returns the policy object unchanged', () => {
    const policy = definePolicy<Post>({
      view: () => true,
    });
    expect(policy).toHaveProperty('view');
    expect(typeof policy.view).toBe('function');
  });
});

describe('enforce', () => {
  const PostPolicy = definePolicy<Post>({
    view: (ctx, post) => post.published || post.authorId === ctx.user.id,
    update: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'ADMIN' || ctx.org?.role === 'OWNER',
    delete: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'OWNER',
  });

  it('allows when policy function returns true', async () => {
    await expect(enforce(PostPolicy, 'view', ownerCtx, publishedPost)).resolves.toBeUndefined();
  });

  it('allows author to view their own draft', async () => {
    await expect(enforce(PostPolicy, 'view', ownerCtx, draftPost)).resolves.toBeUndefined();
  });

  it('throws FORBIDDEN when policy function returns false', async () => {
    await expect(enforce(PostPolicy, 'view', memberCtx, otherUserDraft)).rejects.toThrow(
      'Not authorized to view this resource',
    );
  });

  it('allows when no policy is defined for the ability (fail-open)', async () => {
    await expect(enforce(PostPolicy, 'restore', ownerCtx, publishedPost)).resolves.toBeUndefined();
  });

  it('allows admin to update any post', async () => {
    await expect(enforce(PostPolicy, 'update', adminCtx, otherUserDraft)).resolves.toBeUndefined();
  });

  it('denies member from updating another user post', async () => {
    await expect(enforce(PostPolicy, 'update', memberCtx, otherUserDraft)).rejects.toThrow(
      'Not authorized to update this resource',
    );
  });

  it('allows author to delete their own post', async () => {
    await expect(enforce(PostPolicy, 'delete', ownerCtx, draftPost)).resolves.toBeUndefined();
  });

  it('allows owner role to delete any post', async () => {
    await expect(enforce(PostPolicy, 'delete', ownerCtx, otherUserDraft)).resolves.toBeUndefined();
  });

  it('denies admin from deleting (only owner allowed beyond author)', async () => {
    await expect(enforce(PostPolicy, 'delete', adminCtx, otherUserDraft)).rejects.toThrow(
      'Not authorized to delete this resource',
    );
  });
});

describe('can', () => {
  const policy = definePolicy<Post>({
    view: (ctx, post) => post.published || post.authorId === ctx.user.id,
  });

  it('returns true when allowed', async () => {
    expect(await can(policy, 'view', ownerCtx, publishedPost)).toBe(true);
  });

  it('returns false when denied', async () => {
    expect(await can(policy, 'view', memberCtx, otherUserDraft)).toBe(false);
  });

  it('returns true for unconfigured abilities', async () => {
    expect(await can(policy, 'delete', memberCtx, otherUserDraft)).toBe(true);
  });
});

describe('cannot', () => {
  const policy = definePolicy<Post>({
    view: (_ctx, post) => post.published,
  });

  it('returns true when denied', async () => {
    expect(await cannot(policy, 'view', memberCtx, draftPost)).toBe(true);
  });

  it('returns false when allowed', async () => {
    expect(await cannot(policy, 'view', memberCtx, publishedPost)).toBe(false);
  });
});

describe('async policy functions', () => {
  const asyncPolicy = definePolicy<Post>({
    view: async (_ctx, post) => {
      // Simulate async check (e.g., database lookup)
      return Promise.resolve(post.published);
    },
  });

  it('works with async policy functions', async () => {
    expect(await can(asyncPolicy, 'view', memberCtx, publishedPost)).toBe(true);
    expect(await can(asyncPolicy, 'view', memberCtx, draftPost)).toBe(false);
  });
});

describe('policy without org context', () => {
  const policy = definePolicy<Post>({
    update: (ctx, post) => post.authorId === ctx.user.id,
  });

  it('works when org is undefined', async () => {
    await expect(enforce(policy, 'update', noOrgCtx, draftPost)).resolves.toBeUndefined();
  });

  it('denies when user is not the author and no org', async () => {
    await expect(enforce(policy, 'update', noOrgCtx, otherUserDraft)).rejects.toThrow(
      'Not authorized to update this resource',
    );
  });
});

describe('custom abilities', () => {
  const policy = definePolicy<Post>({
    publish: (ctx, post) => post.authorId === ctx.user.id,
    archive: (ctx, _post) => ctx.org?.role === 'ADMIN' || ctx.org?.role === 'OWNER',
  } as ResourcePolicy<Post>);

  it('supports custom ability names', async () => {
    expect(await can(policy, 'publish', ownerCtx, draftPost)).toBe(true);
    expect(await can(policy, 'publish', memberCtx, otherUserDraft)).toBe(false);
    expect(await can(policy, 'archive', adminCtx, draftPost)).toBe(true);
    expect(await can(policy, 'archive', memberCtx, draftPost)).toBe(false);
  });
});

describe('buildPolicyContext', () => {
  it('builds context from tRPC-shaped ctx with org', () => {
    const trpcCtx = {
      session: { user: { id: 'user-1' } },
      org: { orgId: 'org-1', role: 'ADMIN' },
    };
    const policyCtx = buildPolicyContext(trpcCtx);
    expect(policyCtx).toEqual({
      user: { id: 'user-1' },
      org: { orgId: 'org-1', role: 'ADMIN' },
    });
  });

  it('builds context from tRPC-shaped ctx without org', () => {
    const trpcCtx = {
      session: { user: { id: 'user-1' } },
      org: null,
    };
    const policyCtx = buildPolicyContext(trpcCtx);
    expect(policyCtx).toEqual({
      user: { id: 'user-1' },
      org: null,
    });
  });

  it('throws UNAUTHORIZED when session is missing', () => {
    const trpcCtx = { session: null };
    expect(() => buildPolicyContext(trpcCtx)).toThrow('Authentication required for policy evaluation');
  });
});
