import type { R2ObjectMetadata } from '../shared/cloudflare/r2.service';

type StoredObject = {
  body: ArrayBuffer;
  metadata: R2ObjectMetadata;
};

export type StorageFake = {
  put(key: string, value: ArrayBuffer | string, options?: { httpMetadata?: Record<string, string>; customMetadata?: Record<string, string> }): Promise<R2ObjectMetadata>;
  get(key: string): Promise<{ body: ReadableStream; metadata: R2ObjectMetadata } | null>;
  getAsBuffer(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  assertExists(key: string): void;
  assertNotExists(key: string): void;
  getBuffer(key: string): ArrayBuffer | null;
  keys(): string[];
};

export function createStorageFake(): StorageFake {
  const store = new Map<string, StoredObject>();

  function toArrayBuffer(value: ArrayBuffer | string): ArrayBuffer {
    if (typeof value === 'string') {
      return new TextEncoder().encode(value).buffer;
    }
    return value;
  }

  function makeMetadata(key: string, body: ArrayBuffer): R2ObjectMetadata {
    return {
      key,
      size: body.byteLength,
      etag: `fake-etag-${key}`,
      httpEtag: `"fake-etag-${key}"`,
      uploaded: new Date(),
    };
  }

  return {
    async put(key, value, _options): Promise<R2ObjectMetadata> {
      const body = toArrayBuffer(value as ArrayBuffer | string);
      const metadata = makeMetadata(key, body);
      store.set(key, { body, metadata });
      return metadata;
    },

    async get(key): Promise<{ body: ReadableStream; metadata: R2ObjectMetadata } | null> {
      const entry = store.get(key);
      if (!entry) return null;
      return {
        body: new Response(entry.body).body as ReadableStream,
        metadata: entry.metadata,
      };
    },

    async getAsBuffer(key): Promise<Buffer | null> {
      const entry = store.get(key);
      if (!entry) return null;
      return Buffer.from(entry.body);
    },

    async delete(key): Promise<void> {
      store.delete(key);
    },

    async exists(key): Promise<boolean> {
      return store.has(key);
    },

    assertExists(key: string): void {
      if (!store.has(key)) {
        throw new Error(`Expected storage key "${key}" to exist, but it was not found. Keys: [${[...store.keys()].join(', ')}]`);
      }
    },

    assertNotExists(key: string): void {
      if (store.has(key)) {
        throw new Error(`Expected storage key "${key}" to not exist, but it was found.`);
      }
    },

    getBuffer(key: string): ArrayBuffer | null {
      return store.get(key)?.body ?? null;
    },

    keys(): string[] {
      return [...store.keys()];
    },
  };
}
