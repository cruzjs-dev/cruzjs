---
title: Broadcasting / Real-time
description: Server-Sent Events, presence tracking, and real-time broadcasts in CruzJS
---

CruzJS provides real-time communication between server and clients through Server-Sent Events (SSE), with built-in presence tracking for showing who is online.

## Setup

Register the `BroadcastModule` in your application:

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import { BroadcastModule } from '@cruzjs/core/broadcasting';

registerModules([StartModule, BroadcastModule]);
```

## BroadcastService

The `BroadcastService` is the server-side API for publishing messages and managing presence.

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { BroadcastService } from '@cruzjs/core/broadcasting';

@Injectable()
export class OrderService {
  constructor(
    @Inject(BroadcastService) private readonly broadcast: BroadcastService,
  ) {}

  async placeOrder(orgId: string, order: Order) {
    // ... save order ...

    await this.broadcast.publish(`org:${orgId}:orders`, 'order.created', {
      orderId: order.id,
      total: order.total,
    });
  }
}
```

### Key Methods

| Method | Description |
|--------|-------------|
| `publish(channel, event, data)` | Send a message to all subscribers on a channel |
| `getPresence(channel)` | Get a list of members currently in a presence channel |
| `joinPresence(channel, member)` | Add a member to a presence channel |
| `leavePresence(channel, member)` | Remove a member from a presence channel |

## SSE Endpoint

The module registers an SSE endpoint at `/api/broadcast/sse`. Clients connect with a `channel` query parameter:

```
GET /api/broadcast/sse?channel=org:acme:orders
```

The response uses `Content-Type: text/event-stream` and streams `BroadcastMessage` objects:

```typescript
type BroadcastMessage = {
  event: string;
  data: unknown;
  timestamp: string;
};
```

## Client Hook

Use `useBroadcast` in React components to subscribe to a channel:

```typescript
import { useBroadcast } from '@cruzjs/core/broadcasting/client';

function OrderFeed() {
  const { messages, presenceMembers } = useBroadcast('org:acme:orders');

  return (
    <div>
      <p>{presenceMembers.length} users online</p>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>
            {msg.event}: {JSON.stringify(msg.data)}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

The hook manages the SSE connection lifecycle automatically -- it connects on mount and disconnects on unmount.

## Channel Types

### Public Channels

Any connected client can subscribe. No authentication required.

```typescript
useBroadcast('announcements');
```

### Private Channels

Require authentication. Prefix the channel name with `private-`:

```typescript
useBroadcast('private-user:abc123');
```

The SSE endpoint validates the session token before allowing the connection.

### Presence Channels

Track which members are currently subscribed. Prefix with `presence-`:

```typescript
const { presenceMembers } = useBroadcast('presence-workspace:design');

// presenceMembers: [{ id: 'user1', name: 'Alice' }, { id: 'user2', name: 'Bob' }]
```

Members are automatically added when they connect and removed when they disconnect.

## Platform Backends

### Cloudflare (KV)

The default backend uses `KVSSEBackend`. Messages are published to KV with short TTLs, and presence data is stored in KV with a 24-hour TTL. Clients poll KV for new messages on the SSE connection.

### Docker / Containers (Redis)

For container-based deployments, the broadcast system uses Redis pub/sub for cross-instance message delivery. Configure via the `DockerAdapter`:

```typescript
import { createCruzApp } from '@cruzjs/core';
import { DockerAdapter } from '@cruzjs/adapter-docker';
import * as schema from './database/schema';
import { StartModule } from '@cruzjs/start/start.module';
import { BroadcastModule } from '@cruzjs/core/broadcasting';

export default createCruzApp({
  schema,
  adapter: new DockerAdapter(),
  modules: [StartModule, BroadcastModule],
});
```

Set the `REDIS_URL` environment variable to connect to your Redis instance.

## Example: Live Notification Badge

Server-side -- publish when a notification is created:

```typescript
await this.broadcast.publish(
  `private-user:${userId}`,
  'notification.new',
  { count: unreadCount },
);
```

Client-side -- update the badge in real time:

```typescript
function NotificationBadge({ userId }: { userId: string }) {
  const { messages } = useBroadcast(`private-user:${userId}`);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const latest = messages.findLast((m) => m.event === 'notification.new');
    if (latest) {
      setCount((latest.data as { count: number }).count);
    }
  }, [messages]);

  if (count === 0) return null;
  return <span className="badge">{count}</span>;
}
```

## Example: Presence Indicator

```typescript
function WorkspacePresence({ workspaceId }: { workspaceId: string }) {
  const { presenceMembers } = useBroadcast(`presence-workspace:${workspaceId}`);

  return (
    <div className="flex gap-1">
      {presenceMembers.map((member) => (
        <Avatar key={member.id} name={member.name} size="sm" />
      ))}
    </div>
  );
}
```
