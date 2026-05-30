---
title: API Controllers
description: NestJS-style class-based REST API routers in CruzJS.
---

CruzJS supports class-based REST API routers alongside tRPC. These are useful for webhooks, third-party integrations, public REST endpoints, or any case where a typed tRPC client isn't the right tool.

All REST routes are handled by the `ApiModule` catch-all route at `apps/web/src/routes/api/api.$.ts`, which dispatches to your registered router classes.

## Creating a router

Decorate a class with `@ApiRouter(prefix)` and use HTTP method decorators on its methods:

```ts
// apps/web/src/features/products/products.api.ts
import { Injectable } from '@cruzjs/core/di';
import { ApiRouter, Get, Post, Patch, Delete, Body, Param, Query, HttpCode } from '@cruzjs/core/api';
import { ProductsService } from './products.service';

@ApiRouter('/api/products')
@Injectable()
export class ProductsApiRouter {
  constructor(private readonly products: ProductsService) {}

  @Get()
  async list(@Query('page') page = '1', @Query('perPage') perPage = '25') {
    return this.products.list({ page: Number(page), perPage: Number(perPage) });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.products.getById(id);
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: CreateProductInput) {
    return this.products.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateProductInput) {
    return this.products.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.products.delete(id);
    return { success: true };
  }
}
```

## HTTP method decorators

| Decorator | HTTP Method |
|-----------|------------|
| `@Get(path?)` | GET |
| `@Post(path?)` | POST |
| `@Put(path?)` | PUT |
| `@Patch(path?)` | PATCH |
| `@Delete(path?)` | DELETE |
| `@Head(path?)` | HEAD |
| `@Options(path?)` | OPTIONS |

The optional `path` argument is appended to the router's prefix:

```ts
@ApiRouter('/api/users')
class UsersApiRouter {
  @Get()          // GET /api/users
  @Get(':id')     // GET /api/users/:id
  @Post('search') // POST /api/users/search
}
```

## Parameter decorators

Extract data from the request with parameter decorators:

```ts
@Get(':id')
async getUser(
  @Param('id') id: string,              // URL segment  → /api/users/abc
  @Query('include') include?: string,   // ?include=org
  @Headers('authorization') auth: string, // Authorization header
  @Body() body: Record<string, unknown>,  // Parsed JSON body
  @Session() session: UserSession | null, // Current auth session
  @Req() req: Request,                    // Raw Request object
  @Ip() ip: string,                       // Client IP
) { ... }
```

Omit the key to get the entire object:

```ts
@Post()
async create(
  @Body() body: CreateInput,          // Full body
  @Query() query: Record<string, string>, // All query params
  @Headers() headers: Record<string, string>, // All headers
) { ... }
```

## Overriding status codes

Use `@HttpCode()` to return a non-200 status:

```ts
@Post()
@HttpCode(201)
async create(@Body() body: CreateInput) {
  return this.service.create(body);
}
```

## Registering routers

Register API routers in your module's `providers` array and in the `apiRouters` field:

```ts
// products.module.ts
import { Module } from '@cruzjs/core/di';
import { ProductsService } from './products.service';
import { ProductsApiRouter } from './products.api';

@Module({
  providers: [ProductsService, ProductsApiRouter],
  apiRouters: [ProductsApiRouter],
})
export class ProductsModule {}
```

Then add the module to `createCruzApp()`:

```ts
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import { ProductsModule } from './features/products';

export default createCruzApp({
  schema,
  modules: [ProductsModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

## The catch-all route

The `ApiModule` registers a catch-all at `/api/*` via `apps/web/src/routes/api/api.$.ts`:

```ts
// apps/web/src/routes/api/api.$.ts
import 'reflect-metadata';
import { createApiLoaderHandler, createApiActionHandler } from '@cruzjs/core/api';

export const loader = createApiActionHandler();
export const action = createApiActionHandler();
```

All incoming requests to `/api/*` flow through this file. The `ApiModule` dispatcher matches the URL against registered routers and delegates to the correct method handler.

## Custom API routes

For one-off routes that don't need a full router class, add a React Router route file directly:

```ts
// apps/web/src/routes/api/webhooks.stripe.ts
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';

  // Verify + handle
  return new Response(null, { status: 200 });
}
```

And register it in `apps/web/src/routes.ts`:

```ts
...prefix('api', [
  route('webhooks/stripe', 'routes/api/webhooks.stripe.ts'),
]),
```

## Returning responses

Handler return values are automatically JSON-serialized with `Content-Type: application/json`. Return a `Response` directly to take full control:

```ts
@Get('export')
async export(@Param('id') id: string): Promise<Response> {
  const csv = await this.service.exportCsv(id);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="export-${id}.csv"`,
    },
  });
}
```

## Error handling

Throw `TRPCError` (serialized to JSON) or return a `Response` with an error status:

```ts
import { TRPCError } from '@trpc/server';

@Get(':id')
async get(@Param('id') id: string) {
  const item = await this.service.getById(id);
  if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
  return item;
}
```

Or manually:

```ts
return new Response(JSON.stringify({ error: 'Not found' }), {
  status: 404,
  headers: { 'Content-Type': 'application/json' },
});
```

## API routers vs tRPC

| | tRPC | API Router |
|---|---|---|
| **Client** | Type-safe tRPC client | Any HTTP client |
| **Validation** | Zod input schemas | Manual |
| **Auth** | `protectedProcedure` / `orgProcedure` | `@Session()` decorator |
| **Use case** | Frontend ↔ backend | Webhooks, REST APIs, external integrations |

For anything consumed by your own React frontend, prefer tRPC. Use API routers for public endpoints or integrations with third-party services.
