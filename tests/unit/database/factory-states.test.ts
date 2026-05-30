import { describe, it, expect } from 'vitest';
import { defineFactory } from '@cruzjs/core/database/factories';

describe('defineFactory — state support', () => {
  const UserFactory = defineFactory(() => ({
    id: crypto.randomUUID(),
    email: 'default@example.com',
    isAdmin: false,
    emailVerifiedAt: new Date().toISOString(),
  })).state('admin', { isAdmin: true })
    .state('unverified', { emailVerifiedAt: null as unknown as string });

  it('base build returns defaults', () => {
    const user = UserFactory.build();
    expect(user.isAdmin).toBe(false);
    expect(user.emailVerifiedAt).not.toBeNull();
  });

  it('state("admin").build() applies admin overrides', () => {
    const admin = UserFactory.state('admin').build();
    expect(admin.isAdmin).toBe(true);
    expect(admin.email).toBe('default@example.com');
  });

  it('state overrides merge with build overrides', () => {
    const admin = UserFactory.state('admin').build({ email: 'admin@example.com' });
    expect(admin.isAdmin).toBe(true);
    expect(admin.email).toBe('admin@example.com');
  });

  it('state("unverified") applies unverified overrides', () => {
    const user = UserFactory.state('unverified').build();
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.isAdmin).toBe(false);
  });

  it('base factory is not mutated by state usage', () => {
    const base = UserFactory.build();
    expect(base.isAdmin).toBe(false);
  });

  it('state with function overrides is evaluated per build', () => {
    let callCount = 0;
    const F = defineFactory(() => ({ n: 0 }))
      .state('counter', () => { callCount++; return { n: callCount }; });

    const a = F.state('counter').build();
    const b = F.state('counter').build();
    expect(a.n).toBe(1);
    expect(b.n).toBe(2);
  });

  it('throws on unknown state', () => {
    expect(() => UserFactory.state('nonexistent' as never)).toThrow('Unknown factory state: "nonexistent"');
  });

  it('buildMany works on state factory', () => {
    const admins = UserFactory.state('admin').buildMany(3);
    expect(admins).toHaveLength(3);
    expect(admins.every(a => a.isAdmin)).toBe(true);
  });
});
