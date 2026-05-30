import { describe, it, expect } from 'vitest';
import { createStorageFake } from '@cruzjs/core/testing';

describe('createStorageFake', () => {
  it('stores and retrieves a buffer', async () => {
    const fake = createStorageFake();
    const content = new TextEncoder().encode('hello world').buffer;
    await fake.put('file.txt', content);
    const buf = await fake.getAsBuffer('file.txt');
    expect(buf).not.toBeNull();
    expect(new TextDecoder().decode(buf!)).toBe('hello world');
  });

  it('stores string values', async () => {
    const fake = createStorageFake();
    await fake.put('readme.txt', 'hello string');
    expect(fake.keys()).toContain('readme.txt');
    const buf = fake.getBuffer('readme.txt');
    expect(new TextDecoder().decode(buf!)).toBe('hello string');
  });

  it('returns null for missing keys', async () => {
    const fake = createStorageFake();
    expect(await fake.get('nope')).toBeNull();
    expect(await fake.getAsBuffer('nope')).toBeNull();
    expect(fake.getBuffer('nope')).toBeNull();
  });

  it('delete removes the key', async () => {
    const fake = createStorageFake();
    await fake.put('del.txt', 'bye');
    await fake.delete('del.txt');
    expect(await fake.exists('del.txt')).toBe(false);
  });

  it('assertExists passes when key is present', async () => {
    const fake = createStorageFake();
    await fake.put('a.txt', 'data');
    expect(() => fake.assertExists('a.txt')).not.toThrow();
  });

  it('assertExists throws when key is missing', () => {
    const fake = createStorageFake();
    expect(() => fake.assertExists('missing.txt')).toThrow();
  });

  it('assertNotExists passes when key is absent', () => {
    const fake = createStorageFake();
    expect(() => fake.assertNotExists('ghost.txt')).not.toThrow();
  });

  it('assertNotExists throws when key is present', async () => {
    const fake = createStorageFake();
    await fake.put('there.txt', 'hi');
    expect(() => fake.assertNotExists('there.txt')).toThrow();
  });

  it('keys returns all stored keys', async () => {
    const fake = createStorageFake();
    await fake.put('x.txt', '1');
    await fake.put('y.txt', '2');
    expect(fake.keys()).toEqual(expect.arrayContaining(['x.txt', 'y.txt']));
    expect(fake.keys()).toHaveLength(2);
  });
});
