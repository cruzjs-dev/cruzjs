# /debug

Debug an issue in the codebase.

## Diagnostic Steps

### 1. Identify the Layer

- **UI**: Component not rendering, wrong data displayed
- **tRPC**: API call failing, wrong response
- **Service**: Business logic error
- **Database**: Query returning wrong data

### 2. Check Common Issues

#### tRPC Errors

**"Organization context required"**

- Ensure using `orgProcedure` for org endpoints
- Check `X-Organization-ID` header is being sent
- Verify OrgContext is set in React

**"Authentication required"**

- Check `Authorization: Bearer <token>` header
- Verify session is valid
- Check token expiration

**"Forbidden"**

- User doesn't have required role
- Check `requirePermission()` call
- Verify user is org member

#### Database Issues

**Record not found**

- Check if filtering by correct `orgId` or `userId`
- Check soft delete filter: `isNull(table.deletedAt)`

**Permission denied**

- Verify foreign key references exist
- Check cascade delete settings

#### UI Issues

**Data not updating**

- Call `refetch()` after mutation success
- Check React Query cache invalidation

**Form not submitting**

- Check `isPending` state on mutation
- Verify mutation error handling

### 3. Debug Commands

```bash
# Check server logs
npm run dev

# Check database
npx tsx packages/cli/src/index.tsx db studio

# Run tests
npx tsx packages/cli/src/index.tsx test

# Check TypeScript
npx tsc --noEmit
```

### 4. Logging

Add temporary logging:

```typescript
// Service
console.log("[ProductService] Creating product:", { orgId, data });

// Router
console.log("[productRouter] ctx.org:", ctx.org);

// Component
console.log("[ProductList] data:", data);
```

### 5. Common Fixes

#### Missing org filtering

```typescript
// WRONG
async list() {
  return this.db.select().from(products);
}

// CORRECT
async list(orgId: string) {
  return this.db.select().from(products).where(eq(products.orgId, orgId));
}
```

#### Wrong procedure type

```typescript
// WRONG - using protectedProcedure for org data
protectedProcedure.query(async ({ ctx }) => {
  return service.getOrgData(ctx.org.orgId); // ctx.org doesn't exist!
});

// CORRECT
orgProcedure.query(async ({ ctx }) => {
  return service.getOrgData(ctx.org.orgId);
});
```

#### Missing permission check

```typescript
// WRONG
orgProcedure.mutation(async ({ ctx, input }) => {
  return service.create(ctx.org.orgId, input);
});

// CORRECT
orgProcedure.mutation(async ({ ctx, input }) => {
  await requirePermission(ctx.org, "resource:write");
  return service.create(ctx.org.orgId, input);
});
```

## Reference Docs

- `.claude/kb/05-TRPC-ROUTERS.md` — tRPC context
- `.claude/kb/06-AUTH-ORG-SCOPING.md` — Auth flow
- `.claude/kb/08-DATA-OWNERSHIP.md` — Data filtering
