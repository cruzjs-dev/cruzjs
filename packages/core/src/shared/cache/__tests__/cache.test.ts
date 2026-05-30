/**
 * Cache DX Tests
 *
 * Exercises remember, rememberForever, forget, flush, and tagged-cache
 * against the KVCacheService backed by the in-memory LocalKVNamespace.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalKVNamespace } from '../../cloudflare/local-kv';
import { KVCacheService } from '../../cloudflare/kv-cache.service';
import { CloudflareContext } from '../../cloudflare/context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let kv: LocalKVNamespace;
let cache: KVCacheService;

/**
 * Wire up a fresh in-memory KV and cache service before each test.
 * We set the private static `env` on CloudflareContext so that the
 * `kv` getter returns our LocalKVNamespace via `CACHE_KV`.
 */
function setupCache(): void {
  kv = new LocalKVNamespace();
  (CloudflareContext as any).env = { CACHE_KV: kv as unknown as KVNamespace };
  cache = new KVCacheService('test');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  setupCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// remember
// ---------------------------------------------------------------------------

describe('remember', () => {
  it('should call fn on cache miss and return computed value', async () => {
    const fn = vi.fn(async () => ({ name: 'Alice' }));

    const result = await cache.remember('user:1', 60, fn);

    expect(result).toEqual({ name: 'Alice' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should return cached value on hit without calling fn', async () => {
    const fn = vi.fn(async () => ({ name: 'Alice' }));

    // First call populates cache
    await cache.remember('user:1', 60, fn);

    // Second call should hit cache
    const fn2 = vi.fn(async () => ({ name: 'Bob' }));
    const result = await cache.remember('user:1', 60, fn2);

    expect(result).toEqual({ name: 'Alice' });
    expect(fn2).not.toHaveBeenCalled();
  });

  it('should call fn again after key is deleted', async () => {
    const fn1 = vi.fn(async () => 'first');
    const fn2 = vi.fn(async () => 'second');

    await cache.remember('key', 60, fn1);
    await cache.delete('key');
    const result = await cache.remember('key', 60, fn2);

    expect(result).toBe('second');
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should work with primitive values', async () => {
    const result = await cache.remember('count', 60, async () => 42);
    expect(result).toBe(42);

    const cached = await cache.remember('count', 60, async () => 999);
    expect(cached).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// rememberForever
// ---------------------------------------------------------------------------

describe('rememberForever', () => {
  it('should store value without TTL', async () => {
    const fn = vi.fn(async () => ({ role: 'admin' }));

    const result = await cache.rememberForever('perm:1', fn);

    expect(result).toEqual({ role: 'admin' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should return cached value on subsequent calls', async () => {
    await cache.rememberForever('perm:1', async () => 'original');

    const fn2 = vi.fn(async () => 'updated');
    const result = await cache.rememberForever('perm:1', fn2);

    expect(result).toBe('original');
    expect(fn2).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// forget (alias for delete)
// ---------------------------------------------------------------------------

describe('forget', () => {
  it('should remove the key from cache', async () => {
    await cache.set('temp', 'value');
    expect(await cache.get('temp')).toBe('value');

    const result = await cache.forget('temp');

    expect(result).toBe(true);
    expect(await cache.get('temp')).toBeNull();
  });

  it('should return true even if key did not exist (KV delete is idempotent)', async () => {
    const result = await cache.forget('nonexistent');
    // KV delete does not error on missing keys
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// flush (alias for clear)
// ---------------------------------------------------------------------------

describe('flush', () => {
  it('should clear all keys under the prefix', async () => {
    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.set('c', '3');

    const cleared = await cache.flush();

    expect(cleared).toBe(3);
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
    expect(await cache.get('c')).toBeNull();
  });

  it('should return 0 when cache is empty', async () => {
    const cleared = await cache.flush();
    expect(cleared).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tagged cache
// ---------------------------------------------------------------------------

describe('tags', () => {
  describe('set and get', () => {
    it('should store a value accessible via the tagged handle', async () => {
      const tagged = cache.tags(['users']);

      await tagged.set('user:1', { name: 'Alice' }, 120);
      const result = await tagged.get<{ name: string }>('user:1');

      expect(result).toEqual({ name: 'Alice' });
    });

    it('should also be accessible via the regular cache', async () => {
      const tagged = cache.tags(['users']);

      await tagged.set('user:1', { name: 'Alice' });
      const result = await cache.get<{ name: string }>('user:1');

      expect(result).toEqual({ name: 'Alice' });
    });
  });

  describe('flush', () => {
    it('should delete all keys associated with any of the tags', async () => {
      const taggedUsers = cache.tags(['users']);
      const taggedPosts = cache.tags(['posts']);

      await taggedUsers.set('user:1', 'Alice');
      await taggedUsers.set('user:2', 'Bob');
      await taggedPosts.set('post:1', 'Hello');

      // Flush users tag
      const flushed = await taggedUsers.flush();

      expect(flushed).toBe(2);
      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('user:2')).toBeNull();
      // Post should survive
      expect(await cache.get('post:1')).toBe('Hello');
    });

    it('should flush keys from multiple tags when handle has multiple tags', async () => {
      const tagged = cache.tags(['users', 'permissions']);

      await tagged.set('user:1', 'Alice');

      // Also add a key under just the permissions tag via a different handle
      const permOnly = cache.tags(['permissions']);
      await permOnly.set('perm:admin', 'true');

      // Flush both tags at once
      const flushed = await tagged.flush();

      // user:1 was under both tags, perm:admin under permissions
      // Both should be gone
      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('perm:admin')).toBeNull();
    });

    it('should not affect keys that are not tagged', async () => {
      // Set a key via the regular cache (no tags)
      await cache.set('config:app', 'v1');

      // Set a tagged key
      const tagged = cache.tags(['users']);
      await tagged.set('user:1', 'Alice');

      // Flush the tag
      await tagged.flush();

      // Untagged key should survive
      expect(await cache.get('config:app')).toBe('v1');
    });

    it('should return 0 when flushing a tag with no keys', async () => {
      const tagged = cache.tags(['empty-tag']);
      const flushed = await tagged.flush();
      expect(flushed).toBe(0);
    });
  });

  describe('single tag shorthand', () => {
    it('should accept a single string instead of an array', async () => {
      const tagged = cache.tags('users');

      await tagged.set('user:1', 'Alice');
      const result = await tagged.get<string>('user:1');

      expect(result).toBe('Alice');

      await tagged.flush();
      expect(await cache.get('user:1')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// rememberTagged (existing method — regression coverage)
// ---------------------------------------------------------------------------

describe('rememberTagged', () => {
  it('should compute value on miss and tag the key', async () => {
    const fn = vi.fn(async () => ({ id: '1', name: 'Alice' }));

    const result = await cache.rememberTagged('user:1', 60, ['users'], fn);

    expect(result).toEqual({ id: '1', name: 'Alice' });
    expect(fn).toHaveBeenCalledTimes(1);

    // Flushing the tag should remove the key
    await cache.tags('users').flush();
    expect(await cache.get('user:1')).toBeNull();
  });

  it('should return cached value on hit without calling fn', async () => {
    await cache.rememberTagged('user:1', 60, ['users'], async () => 'first');

    const fn2 = vi.fn(async () => 'second');
    const result = await cache.rememberTagged('user:1', 60, ['users'], fn2);

    expect(result).toBe('first');
    expect(fn2).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Integration: remember + forget cycle
// ---------------------------------------------------------------------------

describe('remember + forget cycle', () => {
  it('should re-compute after forget invalidates the cached value', async () => {
    let counter = 0;
    const fn = async () => {
      counter++;
      return `value-${counter}`;
    };

    const v1 = await cache.remember('counter', 300, fn);
    expect(v1).toBe('value-1');

    await cache.forget('counter');

    const v2 = await cache.remember('counter', 300, fn);
    expect(v2).toBe('value-2');
  });
});
