// Stub for ioredis — not installed in this Cloudflare-first project.
// Real Redis usage goes through KVCacheService. This stub satisfies static analysis
// and allows tests that transitively import redis.service.ts to run without ioredis.
class RedisMock {
  on() { return this; }
  quit() {}
  get() { return Promise.resolve(null); }
  set() { return Promise.resolve('OK'); }
  del() { return Promise.resolve(0); }
}
export default RedisMock;
