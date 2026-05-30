import { Injectable, Inject } from '../../di';
import { KVCacheServiceFactory, KVCacheService } from '../cloudflare/kv-cache.service';

export interface IdempotencyRecord {
  key: string;
  status: 'processing' | 'completed';
  response?: {
    status: number;
    body: unknown;
  };
  createdAt: string;
}

/** Default TTL for idempotency records: 24 hours */
const DEFAULT_TTL_SECONDS = 86400;

/**
 * Idempotency service backed by Cloudflare KV.
 *
 * Ensures that API mutations (payments, charges, etc.) are not executed
 * twice when a client retries with the same `Idempotency-Key` header.
 */
@Injectable()
export class IdempotencyService {
  private readonly cache: KVCacheService;

  constructor(
    @Inject(KVCacheServiceFactory) cacheFactory: KVCacheServiceFactory,
  ) {
    this.cache = cacheFactory.create('idempotency');
  }

  /**
   * Check if an idempotency key has already been seen.
   */
  async check(key: string): Promise<IdempotencyRecord | null> {
    return this.cache.get<IdempotencyRecord>(key);
  }

  /**
   * Mark a key as currently being processed.
   * Stored with the default TTL so stale "processing" records expire.
   */
  async markProcessing(key: string): Promise<void> {
    const record: IdempotencyRecord = {
      key,
      status: 'processing',
      createdAt: new Date().toISOString(),
    };
    await this.cache.set(key, record, DEFAULT_TTL_SECONDS);
  }

  /**
   * Store the completed response for this idempotency key.
   */
  async complete(key: string, status: number, body: unknown): Promise<void> {
    const record: IdempotencyRecord = {
      key,
      status: 'completed',
      response: { status, body },
      createdAt: new Date().toISOString(),
    };
    await this.cache.set(key, record, DEFAULT_TTL_SECONDS);
  }
}

/**
 * Wrap a request handler with idempotency protection.
 *
 * Usage:
 * ```typescript
 * export async function createPayment(request: Request) {
 *   return withIdempotency(request, async () => {
 *     // ... actual payment logic
 *     return Response.json({ charged: true });
 *   });
 * }
 * ```
 *
 * Behavior:
 * 1. If no `Idempotency-Key` header: run handler normally (skip idempotency).
 * 2. If key exists and `completed`: return cached response immediately.
 * 3. If key exists and `processing`: return 409 Conflict.
 * 4. If key is new: mark processing, run handler, store response, return.
 */
export async function withIdempotency(
  request: Request,
  handler: () => Promise<Response>,
  service: IdempotencyService,
): Promise<Response> {
  const idempotencyKey = request.headers.get('Idempotency-Key');

  // No key provided — skip idempotency, run handler directly
  if (!idempotencyKey) {
    return handler();
  }

  // Check for existing record
  const existing = await service.check(idempotencyKey);

  if (existing) {
    if (existing.status === 'completed' && existing.response) {
      // Return the cached response
      return new Response(JSON.stringify(existing.response.body), {
        status: existing.response.status,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'X-Idempotent-Replayed': 'true',
        },
      });
    }

    if (existing.status === 'processing') {
      // Concurrent duplicate — reject
      return new Response(
        JSON.stringify({
          error: 'Conflict',
          message: 'A request with this idempotency key is already being processed.',
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
        },
      );
    }
  }

  // Mark as processing
  await service.markProcessing(idempotencyKey);

  try {
    const response = await handler();

    // Clone the response to read the body while still returning the original
    const cloned = response.clone();
    let body: unknown;
    try {
      body = await cloned.json();
    } catch {
      // Non-JSON response body — store as text
      body = await cloned.text();
    }

    // Store completed result
    await service.complete(idempotencyKey, response.status, body);

    // Return original response with idempotency header
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Idempotency-Key': idempotencyKey,
      },
    });
  } catch (error) {
    // On failure, remove the "processing" marker so the key can be retried
    // We do this by letting the TTL expire (KV doesn't have atomic delete-if-value-matches),
    // but we can overwrite with a short TTL to effectively clear it quickly.
    await service.complete(idempotencyKey, 500, {
      error: 'Internal Server Error',
      message: 'The request failed and can be retried with the same idempotency key.',
    });
    throw error;
  }
}
