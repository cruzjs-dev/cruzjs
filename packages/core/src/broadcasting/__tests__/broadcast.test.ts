/**
 * Broadcasting Unit Tests
 *
 * Tests for channels, events, service, auth, SSE backend, and backward-compatible registry.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PublicChannel,
  PrivateChannel,
  PresenceChannel,
  channel,
  privateChannel,
  presenceChannel,
} from '../broadcast.channel';
import { BroadcastEvent } from '../broadcast.event';
import { BroadcastService } from '../broadcast.service';
import { BroadcastAuthService } from '../broadcast.middleware';
import { SSEConnectionRegistry } from '../sse-handler';
import { InMemorySSEBackend } from '../sse-backend';
import type { SSEBackend, SSEController } from '../sse-backend';
import type { BroadcastAdapter } from '../broadcast.adapter';
import type { PresenceMember, BroadcastMessage } from '../broadcast.types';

// ─── Channel Types ──────────────────────────────────────────────────────────

describe('BroadcastChannel', () => {
  it('PublicChannel has correct type', () => {
    const ch = new PublicChannel('updates');
    expect(ch.type).toBe('public');
    expect(ch.name).toBe('updates');
  });

  it('PrivateChannel has correct type', () => {
    const ch = new PrivateChannel('private-updates');
    expect(ch.type).toBe('private');
    expect(ch.name).toBe('private-updates');
  });

  it('PresenceChannel has correct type', () => {
    const ch = new PresenceChannel('presence-room');
    expect(ch.type).toBe('presence');
    expect(ch.name).toBe('presence-room');
  });

  it('factory functions create correct channel types', () => {
    const pub = channel('pub');
    const priv = privateChannel('priv');
    const pres = presenceChannel('pres');

    expect(pub).toBeInstanceOf(PublicChannel);
    expect(priv).toBeInstanceOf(PrivateChannel);
    expect(pres).toBeInstanceOf(PresenceChannel);
  });
});

// ─── BroadcastEvent ─────────────────────────────────────────────────────────

describe('BroadcastEvent', () => {
  class TestEvent extends BroadcastEvent {
    broadcastOn() {
      return [channel('test-channel'), privateChannel('private-test')];
    }

    broadcastWith() {
      return { message: 'hello' };
    }
  }

  class CustomNameEvent extends BroadcastEvent {
    broadcastOn() {
      return [channel('custom')];
    }

    broadcastAs() {
      return 'my.custom.event';
    }
  }

  it('broadcastOn() returns channel list', () => {
    const event = new TestEvent();
    const channels = event.broadcastOn();
    expect(channels).toHaveLength(2);
    expect(channels[0].name).toBe('test-channel');
    expect(channels[1].name).toBe('private-test');
  });

  it('broadcastAs() returns class name by default', () => {
    const event = new TestEvent();
    expect(event.broadcastAs()).toBe('TestEvent');
  });

  it('broadcastAs() can be overridden', () => {
    const event = new CustomNameEvent();
    expect(event.broadcastAs()).toBe('my.custom.event');
  });

  it('broadcastWith() returns payload', () => {
    const event = new TestEvent();
    expect(event.broadcastWith()).toEqual({ message: 'hello' });
  });

  it('broadcastWith() returns empty object by default', () => {
    class MinimalEvent extends BroadcastEvent {
      broadcastOn() {
        return [channel('minimal')];
      }
    }
    const event = new MinimalEvent();
    expect(event.broadcastWith()).toEqual({});
  });
});

// ─── BroadcastService ───────────────────────────────────────────────────────

describe('BroadcastService', () => {
  let mockAdapter: BroadcastAdapter;
  let mockSSEBackend: SSEBackend;
  let service: BroadcastService;

  beforeEach(() => {
    mockAdapter = {
      publish: vi.fn().mockResolvedValue(undefined),
      getPresence: vi.fn().mockResolvedValue([]),
      joinPresence: vi.fn().mockResolvedValue(undefined),
      leavePresence: vi.fn().mockResolvedValue(undefined),
    };
    mockSSEBackend = {
      mode: 'push',
      publish: vi.fn().mockResolvedValue(undefined),
      addConnection: vi.fn().mockReturnValue(() => {}),
      poll: vi.fn().mockResolvedValue([]),
      getConnectionCount: vi.fn().mockReturnValue(0),
    };
    service = new BroadcastService(mockAdapter, mockSSEBackend);
  });

  it('broadcast() calls adapter.publish for each channel', async () => {
    class MultiChannelEvent extends BroadcastEvent {
      broadcastOn() {
        return [channel('ch1'), channel('ch2'), privateChannel('ch3')];
      }
      broadcastAs() {
        return 'TestEvent';
      }
      broadcastWith() {
        return { key: 'value' };
      }
    }

    await service.broadcast(new MultiChannelEvent());

    expect(mockAdapter.publish).toHaveBeenCalledTimes(3);
    expect(mockAdapter.publish).toHaveBeenCalledWith('ch1', expect.objectContaining({ channel: 'ch1', event: 'TestEvent', data: { key: 'value' } }));
    expect(mockAdapter.publish).toHaveBeenCalledWith('ch2', expect.objectContaining({ channel: 'ch2', event: 'TestEvent', data: { key: 'value' } }));
    expect(mockAdapter.publish).toHaveBeenCalledWith('ch3', expect.objectContaining({ channel: 'ch3', event: 'TestEvent', data: { key: 'value' } }));
  });

  it('broadcast() publishes to SSE backend for each channel', async () => {
    class MultiChannelEvent extends BroadcastEvent {
      broadcastOn() {
        return [channel('ch1'), channel('ch2')];
      }
      broadcastAs() {
        return 'TestEvent';
      }
      broadcastWith() {
        return { key: 'value' };
      }
    }

    await service.broadcast(new MultiChannelEvent());

    expect(mockSSEBackend.publish).toHaveBeenCalledTimes(2);

    // Verify the message shape
    const [publishedChannel, publishedMsg] = (mockSSEBackend.publish as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(publishedChannel).toBe('ch1');
    expect(publishedMsg).toMatchObject({
      channel: 'ch1',
      event: 'TestEvent',
      data: { key: 'value' },
    });
    expect(publishedMsg.id).toBeDefined();
    expect(publishedMsg.timestamp).toBeDefined();
  });

  it('broadcast() with no adapter does not throw', async () => {
    const noAdapterService = new BroadcastService(undefined, mockSSEBackend);

    class SimpleEvent extends BroadcastEvent {
      broadcastOn() {
        return [channel('test')];
      }
    }

    // Should not throw
    await expect(noAdapterService.broadcast(new SimpleEvent())).resolves.toBeUndefined();
    // SSE backend should still be called
    expect(mockSSEBackend.publish).toHaveBeenCalledTimes(1);
  });

  it('publish() accepts string channel name', async () => {
    await service.publish('my-channel', 'event-name', { foo: 'bar' });

    expect(mockAdapter.publish).toHaveBeenCalledWith('my-channel', expect.objectContaining({ channel: 'my-channel', event: 'event-name', data: { foo: 'bar' } }));
    expect(mockSSEBackend.publish).toHaveBeenCalledTimes(1);
  });

  it('publish() accepts BroadcastChannel instance', async () => {
    const ch = channel('channel-instance');
    await service.publish(ch, 'event-name', { data: true });

    expect(mockAdapter.publish).toHaveBeenCalledWith('channel-instance', expect.objectContaining({ channel: 'channel-instance', event: 'event-name', data: { data: true } }));
  });

  it('getPresence() delegates to adapter', async () => {
    const members: PresenceMember[] = [
      { userId: 'user1', joinedAt: '2026-01-01T00:00:00Z' },
    ];
    (mockAdapter.getPresence as ReturnType<typeof vi.fn>).mockResolvedValue(members);

    const result = await service.getPresence('presence-room');
    expect(result).toEqual(members);
    expect(mockAdapter.getPresence).toHaveBeenCalledWith('presence-room');
  });

  it('getPresence() returns empty array with no adapter', async () => {
    const noAdapterService = new BroadcastService(undefined, mockSSEBackend);
    const result = await noAdapterService.getPresence('room');
    expect(result).toEqual([]);
  });

  it('joinPresence() delegates to adapter', async () => {
    await service.joinPresence('room', 'user1', { name: 'Alice' });
    expect(mockAdapter.joinPresence).toHaveBeenCalledWith('room', 'user1', { name: 'Alice' });
  });

  it('leavePresence() delegates to adapter', async () => {
    await service.leavePresence('room', 'user1');
    expect(mockAdapter.leavePresence).toHaveBeenCalledWith('room', 'user1');
  });
});

// ─── BroadcastAuthService ───────────────────────────────────────────────────

describe('BroadcastAuthService', () => {
  let authService: BroadcastAuthService;
  const request = new Request('https://example.com');

  beforeEach(() => {
    authService = new BroadcastAuthService();
  });

  it('authorize() matches exact channel name', async () => {
    authService.authorizeChannel('admin-updates', async () => true);

    const result = await authService.authorize('admin-updates', 'user1', request);
    expect(result).toBe(true);
  });

  it('authorize() matches wildcard pattern', async () => {
    authService.authorizeChannel('org.*.orders', async (channel, userId) => {
      return userId === 'user1';
    });

    const result = await authService.authorize('org.abc.orders', 'user1', request);
    expect(result).toBe(true);

    const denied = await authService.authorize('org.abc.orders', 'user2', request);
    expect(denied).toBe(false);
  });

  it('authorize() returns false for unregistered channel', async () => {
    const result = await authService.authorize('unknown-channel', 'user1', request);
    expect(result).toBe(false);
  });

  it('authorize() wildcard does not match across dots', async () => {
    authService.authorizeChannel('org.*.orders', async () => true);

    // Should not match because * only matches one segment
    const result = await authService.authorize('org.a.b.orders', 'user1', request);
    expect(result).toBe(false);
  });

  it('authorize() handler receives channel name and userId', async () => {
    const handler = vi.fn().mockResolvedValue(true);
    authService.authorizeChannel('test-channel', handler);

    await authService.authorize('test-channel', 'user123', request);
    expect(handler).toHaveBeenCalledWith('test-channel', 'user123', request);
  });
});

// ─── InMemorySSEBackend ─────────────────────────────────────────────────────

describe('InMemorySSEBackend', () => {
  let backend: InMemorySSEBackend;

  beforeEach(() => {
    backend = new InMemorySSEBackend();
  });

  it('has push mode', () => {
    expect(backend.mode).toBe('push');
  });

  it('publish() sends to all connections', async () => {
    const enqueueSpy1 = vi.fn();
    const enqueueSpy2 = vi.fn();

    const controller1: SSEController = { enqueue: enqueueSpy1 };
    const controller2: SSEController = { enqueue: enqueueSpy2 };

    backend.addConnection('test-channel', controller1);
    backend.addConnection('test-channel', controller2);

    const message: BroadcastMessage = {
      id: 'msg-1',
      channel: 'test-channel',
      event: 'TestEvent',
      data: { key: 'value' },
      timestamp: '2026-01-01T00:00:00Z',
    };

    await backend.publish('test-channel', message);

    expect(enqueueSpy1).toHaveBeenCalledTimes(1);
    expect(enqueueSpy2).toHaveBeenCalledTimes(1);

    // Verify the SSE format
    const sentData = enqueueSpy1.mock.calls[0][0] as string;
    expect(sentData).toContain('event: TestEvent');
    expect(sentData).toContain('"key":"value"');
    expect(sentData).toContain('id: msg-1');
    expect(sentData).toContain('data: ');
  });

  it('getConnectionCount() returns correct count', () => {
    expect(backend.getConnectionCount('test')).toBe(0);

    const controller1: SSEController = { enqueue: vi.fn() };
    const controller2: SSEController = { enqueue: vi.fn() };

    backend.addConnection('test', controller1);
    expect(backend.getConnectionCount('test')).toBe(1);

    backend.addConnection('test', controller2);
    expect(backend.getConnectionCount('test')).toBe(2);
  });

  it('addConnection() returns unsubscribe function', () => {
    const controller: SSEController = { enqueue: vi.fn() };

    const unsubscribe = backend.addConnection('test', controller);
    expect(backend.getConnectionCount('test')).toBe(1);

    unsubscribe();
    expect(backend.getConnectionCount('test')).toBe(0);
  });

  it('publish() removes controllers that throw on enqueue', async () => {
    const brokenController: SSEController = {
      enqueue: vi.fn().mockImplementation(() => {
        throw new Error('Controller closed');
      }),
    };

    const goodController: SSEController = { enqueue: vi.fn() };

    backend.addConnection('test', brokenController);
    backend.addConnection('test', goodController);

    const message: BroadcastMessage = {
      id: 'msg-2',
      channel: 'test',
      event: 'Event',
      data: {},
      timestamp: '2026-01-01T00:00:00Z',
    };

    await backend.publish('test', message);

    // Broken controller should be removed
    expect(backend.getConnectionCount('test')).toBe(1);
    expect(goodController.enqueue).toHaveBeenCalledTimes(1);
  });

  it('publish() to non-existent channel does nothing', async () => {
    const message: BroadcastMessage = {
      id: 'msg-3',
      channel: 'nonexistent',
      event: 'Event',
      data: {},
      timestamp: '2026-01-01T00:00:00Z',
    };

    // Should not throw
    await backend.publish('nonexistent', message);
  });

  it('getTotalConnectionCount() sums across channels', () => {
    const c1: SSEController = { enqueue: vi.fn() };
    const c2: SSEController = { enqueue: vi.fn() };
    const c3: SSEController = { enqueue: vi.fn() };

    backend.addConnection('ch1', c1);
    backend.addConnection('ch2', c2);
    backend.addConnection('ch2', c3);

    expect(backend.getTotalConnectionCount()).toBe(3);
  });

  it('clear() removes all connections', () => {
    const c1: SSEController = { enqueue: vi.fn() };
    backend.addConnection('ch1', c1);

    backend.clear();
    expect(backend.getTotalConnectionCount()).toBe(0);
  });

  it('poll() always returns empty array', async () => {
    const result = await backend.poll('any-channel');
    expect(result).toEqual([]);
  });

  it('broadcast() convenience method delivers via publish()', async () => {
    const enqueueSpy = vi.fn();
    const controller: SSEController = { enqueue: enqueueSpy };
    backend.addConnection('test-channel', controller);

    backend.broadcast('test-channel', 'TestEvent', { hello: 'world' });

    // Allow the fire-and-forget promise to settle
    await new Promise((r) => setTimeout(r, 10));

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const sentData = enqueueSpy.mock.calls[0][0] as string;
    expect(sentData).toContain('event: TestEvent');
    expect(sentData).toContain('"hello":"world"');
  });
});

// ─── SSEConnectionRegistry (backward compat alias) ─────────────────────────

describe('SSEConnectionRegistry (backward compat)', () => {
  it('SSEConnectionRegistry is InMemorySSEBackend', () => {
    const registry = new SSEConnectionRegistry();
    expect(registry.mode).toBe('push');
    expect(registry).toBeInstanceOf(InMemorySSEBackend);
  });

  it('broadcast() works on backward-compat alias', () => {
    const registry = new SSEConnectionRegistry();
    const enqueueSpy = vi.fn();
    const controller: SSEController = { enqueue: enqueueSpy };
    registry.addConnection('ch', controller);

    registry.broadcast('ch', 'Evt', { x: 1 });

    // Allow the fire-and-forget promise to settle
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(enqueueSpy).toHaveBeenCalledTimes(1);
        resolve();
      }, 10);
    });
  });
});
