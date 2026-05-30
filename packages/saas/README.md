# @cruzjs/saas

Team management, billing, and permissions for CruzJS applications.

## Features

- **Organizations** — Create and manage organizations with slugs, avatars, settings
- **Members** — Invite members, manage roles (OWNER, ADMIN, MEMBER, VIEWER)
- **Permissions** — Role-based access control with granular permissions
- **Billing** — Stripe integration with subscription plans, usage metering, customer portal
- **Invitations** — Email-based org invitations with token verification
- **Audit Logs** — Track mutations and sensitive actions
- **Admin** — Super admin panel for user/org management

## Installation

```bash
npm install @cruzjs/saas
```

## Peer Dependencies

- `@cruzjs/core` >= 0.1.0
- `drizzle-orm` >= 0.36.0
- `inversify` >= 7.0.0
- `zod` >= 3.0.0
- `stripe` (bundled)

## Configuration

Set environment variables:

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
