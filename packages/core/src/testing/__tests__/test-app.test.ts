import { describe, it, expect } from 'vitest';
import { createTestApp } from '../test-app';

describe('createTestApp', () => {
  it('calls handler with GET request', async () => {
    const app = createTestApp(async (req) => {
      expect(req.method).toBe('GET');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const result = await app.get('/api/test').expect(200).expectJson<{ ok: boolean }>();
    expect(result.ok).toBe(true);
  });

  it('attaches Authorization header via asUser', async () => {
    const app = createTestApp(async (req) => {
      const auth = req.headers.get('Authorization');
      return new Response(JSON.stringify({ auth }), { status: 200 });
    });
    const result = await app.asUser('tok_abc').get('/api/me').expectJson<{ auth: string }>();
    expect(result.auth).toBe('Bearer tok_abc');
  });

  it('sends POST body as JSON', async () => {
    const app = createTestApp(async (req) => {
      const body = await req.json();
      return new Response(JSON.stringify(body), { status: 201 });
    });
    const result = await app.post('/api/items', { name: 'test' }).expect(201).expectJson<{ name: string }>();
    expect(result.name).toBe('test');
  });

  it('throws when status does not match', async () => {
    const app = createTestApp(async () => new Response('not found', { status: 404 }));
    await expect(app.get('/missing').expect(200).execute()).rejects.toThrow('Expected status 200, got 404');
  });
});
