---
title: Flash Messages
description: Display one-time success/error/info messages across redirects in CruzJS.
---

Flash messages are one-time notifications that survive exactly one redirect cycle. Set a message in an action, redirect, read it in the next loader, and it is automatically cleared. CruzJS implements this with an `HttpOnly` cookie -- no session store required.

## Setting Flash Messages

Use `FlashService` in an action to queue messages before redirecting:

```typescript
import { FlashService } from '@cruzjs/core';
import { redirect } from 'react-router';

export const action = async (args: ActionFunctionArgs) =>
  handleCruzAction([args], async ({ request, container }) => {
    const flash = container.resolve(FlashService);
    flash.init(request);

    try {
      await itemService.create(input);
      flash.success('Item created successfully');
    } catch (err) {
      flash.error('Failed to create item', 'Error');
    }

    return redirect('/items', { headers: flash.headers() });
  });
```

The `flash.headers()` call returns a `Headers` object containing the `Set-Cookie` header that persists the messages into the redirect response.

## Reading Flash Messages

In the destination loader, consume the messages and return them alongside your data:

```typescript
export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ request, container }) => {
    const flash = container.resolve(FlashService);
    flash.init(request);
    const messages = flash.consume();

    const items = await itemService.list();

    return json({ items, flash: messages }, { headers: flash.headers() });
  });
```

`consume()` reads all incoming messages and marks them for clearing. The `headers: flash.headers()` in the response clears the cookie so the messages do not appear again on the next navigation.

## Displaying in React

Use the `useFlash()` hook from `@cruzjs/start` to access flash messages in any component:

```tsx
import { useFlash } from '@cruzjs/start';

export default function ItemsPage() {
  const { items } = useLoaderData();
  const flash = useFlash();

  return (
    <div>
      {flash.map((msg, i) => (
        <div key={i} role="alert" className={`alert alert-${msg.level}`}>
          {msg.title && <strong>{msg.title}: </strong>}
          {msg.message}
        </div>
      ))}

      <h1>Items</h1>
      {/* render items... */}
    </div>
  );
}
```

The hook searches the current route and parent routes for a `flash` property in loader data, walking from the most specific route upward. This means you can set flash data in a layout loader and read it in any child route.

## Available Levels

| Method | Level | Use case |
|--------|-------|----------|
| `flash.success(message, title?)` | `success` | Confirmation of a completed action |
| `flash.error(message, title?)` | `error` | Something went wrong |
| `flash.warning(message, title?)` | `warning` | Action completed with caveats |
| `flash.info(message, title?)` | `info` | Neutral information |

All methods accept an optional `title` string displayed alongside the message.

You can also use the generic method for programmatic level selection:

```typescript
flash.flash('success', 'Saved!', 'Optional Title');
```

## Multiple Messages

You can queue multiple flash messages in a single action. They are all delivered together:

```typescript
flash.success('Order placed');
flash.info('Confirmation email sent');
flash.warning('Shipping may take 5-7 days');

return redirect('/orders', { headers: flash.headers() });
```

All three messages appear in the `useFlash()` array on the next page.

## FlashMessage Type

```typescript
type FlashLevel = 'success' | 'error' | 'warning' | 'info';

type FlashMessage = {
  level: FlashLevel;
  message: string;
  title?: string;
};
```

## Implementation Details

- **Cookie name:** `__cruz_flash`
- **Cookie attributes:** `Path=/; HttpOnly; SameSite=Lax; Max-Age=120`
- **Encoding:** Base64-encoded JSON, URI-encoded
- Messages are cleared by setting `Max-Age=0` after consuming
- `peek()` reads messages without consuming them (they persist for the next request)
