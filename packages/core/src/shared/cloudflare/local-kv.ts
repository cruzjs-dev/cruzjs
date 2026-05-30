/**
 * In-memory KVNamespace facade for local development.
 *
 * Provides the same runtime interface as Cloudflare KV so that
 * KVCacheService (and any other code reading CloudflareContext.kv)
 * works transparently when running without wrangler.
 *
 * Data lives only for the lifetime of the process — that's fine for
 * a dev-mode cache.
 */

type StoredEntry = {
  value: string;
  expiration?: number; // epoch seconds
  metadata?: unknown;
};

export class LocalKVNamespace {
  private store = new Map<string, StoredEntry>();

  private isExpired(entry: StoredEntry): boolean {
    if (!entry.expiration) return false;
    return Date.now() / 1000 > entry.expiration;
  }

  async get(key: string, options?: any): Promise<any> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }

    const type =
      typeof options === 'string' ? options : options?.type ?? 'text';

    switch (type) {
      case 'json':
        return JSON.parse(entry.value);
      case 'arrayBuffer':
        return new TextEncoder().encode(entry.value).buffer;
      case 'stream': {
        const bytes = new TextEncoder().encode(entry.value);
        return new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        });
      }
      case 'text':
      default:
        return entry.value;
    }
  }

  async getWithMetadata(
    key: string,
    options?: any
  ): Promise<{ value: any; metadata: any; cacheStatus: any }> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return { value: null, metadata: null, cacheStatus: null };
    }
    const value = await this.get(key, options);
    return { value, metadata: entry.metadata ?? null, cacheStatus: null };
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { expiration?: number; expirationTtl?: number; metadata?: unknown }
  ): Promise<void> {
    let stringValue: string;
    if (typeof value === 'string') {
      stringValue = value;
    } else if (value instanceof ArrayBuffer) {
      stringValue = new TextDecoder().decode(value);
    } else if (ArrayBuffer.isView(value)) {
      stringValue = new TextDecoder().decode(value);
    } else {
      // ReadableStream — consume it
      const reader = (value as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) chunks.push(result.value);
      }
      const merged = new Uint8Array(
        chunks.reduce((a, c) => a + c.length, 0)
      );
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      stringValue = new TextDecoder().decode(merged);
    }

    let expiration: number | undefined;
    if (options?.expiration) {
      expiration = options.expiration;
    } else if (options?.expirationTtl) {
      expiration = Math.floor(Date.now() / 1000) + options.expirationTtl;
    }

    this.store.set(key, {
      value: stringValue,
      expiration,
      metadata: options?.metadata,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<any> {
    const prefix = options?.prefix ?? '';
    const limit = options?.limit ?? 1000;
    const cursorStart = options?.cursor ? parseInt(options.cursor, 10) : 0;

    const matching: { name: string; expiration?: number; metadata?: unknown }[] = [];
    for (const [key, entry] of this.store.entries()) {
      if (this.isExpired(entry)) {
        this.store.delete(key);
        continue;
      }
      if (key.startsWith(prefix)) {
        matching.push({
          name: key,
          expiration: entry.expiration,
          metadata: entry.metadata,
        });
      }
    }

    matching.sort((a, b) => a.name.localeCompare(b.name));

    const page = matching.slice(cursorStart, cursorStart + limit);
    const done = cursorStart + limit >= matching.length;

    return {
      keys: page,
      list_complete: done,
      cursor: done ? '' : String(cursorStart + limit),
      cacheStatus: null,
    };
  }
}
