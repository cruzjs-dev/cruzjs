/**
 * Cloudflare Services
 *
 * Provides R2 storage, KV cache, and email services for Cloudflare Workers.
 * Note: These services require actual Cloudflare bindings when running
 * in the Workers environment.
 */

export { R2Service, R2_SERVICE } from './r2.service';
export { EmailSendService, EMAIL_SEND_SERVICE } from './email-send.service';
export { KVCacheService, KVCacheServiceFactory } from './kv-cache.service';
export { CloudflareContext, type CloudflareEnv } from './context';
export { LocalKVNamespace } from './local-kv';
