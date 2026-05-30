---
title: CSRF Protection
description: Cross-site request forgery protection with token generation, header validation, and middleware integration in CruzJS.
---

CruzJS includes CSRF protection through the `CSRFService` and `requireCSRF` middleware. State-changing requests (POST, PUT, PATCH, DELETE) are validated for a CSRF token, while GET and HEAD requests are exempt.

## How it works

The CSRF protection flow:

1. The server generates a CSRF token and provides it to the client (via an API call or embedded in the page).
2. The client includes the token in every state-changing request via the `X-CSRF-Token` header or a `_csrf` body field.
3. The `requireCSRF` middleware validates the token before processing the request.

## `CSRFService`

The service handles token generation and verification:

```typescript
import { CSRFService } from '@cruzjs/core/shared/security/csrf.service';

const csrfService = new CSRFService();

// Generate a token (32 bytes, hex encoded)
const token = csrfService.generateToken();

// Verify token (compares against session-stored token)
const isValid = csrfService.verifyToken(token, storedToken);

// Extract token from request
const headerToken = csrfService.getTokenFromHeader(request); // X-CSRF-Token header
const bodyToken = csrfService.getTokenFromBody(body);        // _csrf field
```

The `CSRFService` constructor accepts an optional `secret` parameter. If not provided, it reads from the `CSRF_SECRET` environment variable or generates a random secret.

## `requireCSRF` middleware

Apply the middleware to React Router loaders/actions that handle form submissions:

```typescript
import { requireCSRF } from '@cruzjs/core/shared/middleware/csrf.middleware';

export async function action({ request }: ActionFunctionArgs) {
  await requireCSRF(request, container);

  // CSRF validated -- process the form
}
```

The middleware:
1. Skips GET and HEAD requests (read-only, no CSRF risk).
2. Requires an active session (calls `requireSession` internally).
3. Extracts the CSRF token from the `X-CSRF-Token` header or the `_csrf` body field.
4. Rejects the request if no token is found or the token is invalid (less than 32 characters).

## Client-side integration

### With `X-CSRF-Token` header

Fetch a CSRF token from the server and include it in requests:

```typescript
// Store the token (e.g., from an initial page load or API response)
const csrfToken = await fetchCsrfToken();

// Include in mutation requests
const response = await fetch('/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ /* ... */ }),
});
```

### With form `_csrf` field

For traditional form submissions, include the token as a hidden field:

```tsx
function MyForm({ csrfToken }: { csrfToken: string }) {
  return (
    <form method="POST" action="/submit">
      <input type="hidden" name="_csrf" value={csrfToken} />
      <input type="text" name="title" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## tRPC API exemptions

tRPC endpoints do not use the `requireCSRF` middleware directly because tRPC requests are made via JavaScript (not browser form submissions) and use session tokens in the `Authorization` header. The session token itself acts as a CSRF defense since:

1. It is sent via `Authorization: Bearer <token>`, not cookies
2. Cross-origin requests cannot read or set this header due to CORS restrictions

If your tRPC client uses cookie-based sessions instead, you should add CSRF protection to the tRPC middleware.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CSRF_SECRET` | No | Secret for CSRF service. Auto-generated if not set. |
