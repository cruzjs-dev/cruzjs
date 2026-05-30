# Flash Messages

Cookie-based one-time messages that survive exactly one redirect cycle. Set in an action, read in the next loader, then automatically cleared.

## FlashService

Located at `packages/core/src/flash/flash.service.ts`. Decorated with `@Injectable()`.

### init(request)

Must be called before any other method. Reads existing flash messages from the `__cruz_flash` cookie.

```typescript
const flash = container.resolve(FlashService);
flash.init(request);
```

### Setting Messages

```typescript
flash.success('Item created successfully');
flash.error('Failed to save', 'Save Error');
flash.warning('Your trial expires soon');
flash.info('New features available');

// Generic:
flash.flash('success', 'Custom message', 'Optional Title');
```

All set methods accept `(message: string, title?: string)`.

### headers()

Returns a `Headers` object with the `Set-Cookie` header to persist pending messages or clear consumed ones. Must be merged into the response:

```typescript
return redirect('/items', { headers: flash.headers() });
```

Also available as `headerRecord()` returning `Record<string, string>`.

### consume()

Read all incoming flash messages. Marks them for clearing on the next response. Subsequent calls return `[]`.

```typescript
const messages = flash.consume();
// messages: FlashMessage[] = [{ level: 'success', message: '...', title?: '...' }]
```

### peek()

Read without consuming -- messages remain available on the next request.

## FlashMessage Type

```typescript
type FlashLevel = 'success' | 'error' | 'warning' | 'info';
type FlashMessage = { level: FlashLevel; message: string; title?: string };
```

## Full Action -> Redirect -> Loader -> Component Pattern

### Action (set flash + redirect)

```typescript
export const action = async (args: ActionFunctionArgs) =>
  handleCruzAction([args], async ({ request, container }) => {
    const flash = container.resolve(FlashService);
    flash.init(request);

    // ... do work ...
    flash.success('Item created');

    return redirect('/items', { headers: flash.headers() });
  });
```

### Loader (consume flash)

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

The `headers: flash.headers()` in the loader clears the cookie after consuming.

### Component (useFlash hook)

```typescript
import { useFlash } from '@cruzjs/start';

export default function ItemsPage() {
  const flash = useFlash();

  return (
    <div>
      {flash.map((msg, i) => (
        <div key={i} className={`flash-${msg.level}`}>
          {msg.title && <strong>{msg.title}</strong>}
          <p>{msg.message}</p>
        </div>
      ))}
      {/* ... rest of page ... */}
    </div>
  );
}
```

### useFlash() Hook

Located at `packages/start/src/layout/use-flash.ts`. Searches route loader data (most specific route first) for a `flash` property containing an array of `FlashMessage`.

## Implementation Details

- Cookie name: `__cruz_flash`
- Cookie attributes: `Path=/; HttpOnly; SameSite=Lax; Max-Age=120`
- Encoding: `encodeURIComponent(btoa(JSON.stringify(messages)))`
- Cleared by setting `Max-Age=0` after consuming
