# CruzJS — Rails/Django Parity Feature Plan

## Feature Inventory (18 features, 120+ sub-features)

### Dependency Order:
1. Pagination (no deps — foundational for all list endpoints)
2. Soft Deletes (no deps — foundational for all entities)
3. Session Management (no deps — foundational for auth features)
4. Audit Logging (depends on: session management for actor context)
5. Two-Factor Auth (depends on: session management)
6. Magic Link / Passwordless Auth (depends on: session management)
7. Serializers / API Resources (no deps — enhances all API responses)
8. API Versioning (no deps — enhances all routers)
9. Full-Text Search (depends on: pagination for results)
10. Error Reporting (no deps — observability)
11. Multi-Database (no deps — infrastructure)
12. Sitemaps (no deps — SEO)
13. Interactive Console (no deps — DX)
14. Social Auth Enhancement (depends on: session management)
15. Observability / Tracing (depends on: error reporting)
16. Admin Dashboard (depends on: pagination, audit logging, serializers)
17. Billing (depends on: audit logging)
18. Rich Text (no deps — content)

---

## Feature 1: Pagination (`packages/core/src/pagination/`)

### Sub-features:
- 1.1 `PaginatedResult<T>` generic type with `data`, `meta`, `links`
- 1.2 `OffsetPaginationMeta` — `page`, `perPage`, `total`, `totalPages`
- 1.3 `CursorPaginationMeta` — `cursor`, `nextCursor`, `prevCursor`, `hasMore`
- 1.4 `PaginationService` — `@Injectable()`, offset + cursor strategies
- 1.5 `paginateOffset(query, params)` — Drizzle helper wrapping `limit/offset/count`
- 1.6 `paginateCursor(query, params)` — Drizzle helper with cursor-based keyset pagination
- 1.7 `paginationSchema` — Zod schemas for offset (`page`, `perPage`) and cursor (`cursor`, `limit`)
- 1.8 `paginatedMiddleware` — tRPC middleware injecting pagination params
- 1.9 `buildLinkHeader(meta, baseUrl)` — RFC 5988 Link header builder
- 1.10 `PaginationModule` — `@Module` registration

### Adapters needed: None (pure logic, DB-agnostic via Drizzle)
### E2E test: `tests/e2e/tests/pagination.spec.ts`

---

## Feature 2: Soft Deletes (`packages/core/src/soft-delete/`)

### Sub-features:
- 2.1 `softDeleteColumns()` — Drizzle column mixin adding `deletedAt` (nullable timestamp)
- 2.2 `SoftDeleteScope` enum — `DEFAULT` (exclude deleted), `WITH_DELETED`, `ONLY_DELETED`
- 2.3 `withSoftDelete(query, scope)` — Drizzle query wrapper applying WHERE clauses
- 2.4 `SoftDeleteService<T>` — generic `@Injectable()` base with `softDelete()`, `restore()`, `forceDelete()`
- 2.5 `bulkSoftDelete(ids)` — batch soft-delete
- 2.6 `SoftDeleteMiddleware` — tRPC middleware auto-filtering deleted records
- 2.7 `SoftDeleteModule` — `@Module` registration
- 2.8 `@SoftDeletable()` decorator for schema tables

### Adapters needed: None (pure Drizzle logic)
### E2E test: `tests/e2e/tests/soft-deletes.spec.ts`

---

## Feature 3: Session Management (`packages/core/src/sessions/`)

### Sub-features:
- 3.1 `sessions` Drizzle schema — `id`, `userId`, `token`, `ipAddress`, `userAgent`, `deviceFingerprint`, `lastActiveAt`, `expiresAt`, `revokedAt`, `metadata`
- 3.2 `SessionService` — `@Injectable()` with `create()`, `validate()`, `revoke()`, `revokeAll()`, `listActive()`, `touch()`, `prune()`
- 3.3 `DeviceFingerprint` utility — hash of user agent + accept headers + screen resolution
- 3.4 `SessionAdapter` interface — `store()`, `retrieve()`, `destroy()`, `listByUser()`
- 3.5 `KVSessionAdapter` — Cloudflare KV / Redis backed
- 3.6 `DatabaseSessionAdapter` — SQLite/D1 backed (default)
- 3.7 Concurrent session limit enforcement — configurable max sessions per user
- 3.8 `SessionTrpc` — OOP router with `listSessions`, `revokeSession`, `revokeAllSessions`
- 3.9 `SessionModule` — `@Module` registration
- 3.10 `SESSION_ADAPTER` DI token with `@Optional()` fallback

### Adapters needed: Yes — session storage per platform
- Cloudflare: KV-backed
- AWS: DynamoDB-backed
- GCP: Firestore-backed
- Azure: Table Storage-backed
- DigitalOcean: Redis-backed
- Docker: Redis-backed

### E2E test: `tests/e2e/tests/session-management.spec.ts`

---

## Feature 4: Audit Logging (`packages/core/src/audit/`)

### Sub-features:
- 4.1 `auditLog` Drizzle schema — `id`, `action`, `entityType`, `entityId`, `actorId`, `actorType`, `orgId`, `before` (JSON), `after` (JSON), `diff` (JSON), `ipAddress`, `userAgent`, `metadata`, `createdAt`
- 4.2 `AuditAction` const enum — `CREATE`, `UPDATE`, `DELETE`, `RESTORE`, `LOGIN`, `LOGOUT`, `EXPORT`, `IMPORT`, `PERMISSION_CHANGE`
- 4.3 `AuditLogService` — `@Injectable()` with `log()`, `query()`, `getEntityHistory()`, `getActorHistory()`, `diffSnapshots()`
- 4.4 `AuditLogAdapter` interface — `write()`, `query()`, `prune()`
- 4.5 `DatabaseAuditAdapter` — D1/SQLite default
- 4.6 `auditMiddleware` — tRPC middleware auto-capturing mutations with before/after snapshots
- 4.7 `@Auditable()` decorator — mark service methods for auto-logging
- 4.8 Retention policy — configurable TTL, auto-prune via scheduler
- 4.9 `AuditLogTrpc` — OOP router with `list`, `getEntityHistory`, `getActorHistory`
- 4.10 `AuditModule` — `@Module` registration

### Adapters needed: Yes — storage per platform
- Cloudflare: D1-backed
- AWS: CloudWatch Logs / DynamoDB
- GCP: Cloud Logging / Firestore
- Azure: Application Insights / Table Storage
- DigitalOcean: Database-backed
- Docker: Database-backed

### E2E test: `tests/e2e/tests/audit-logging.spec.ts`

---

## Feature 5: Two-Factor Auth (`packages/core/src/two-factor/`)

### Sub-features:
- 5.1 `twoFactorSecrets` Drizzle schema — `id`, `userId`, `type` (totp|sms|email), `secret` (encrypted), `backupCodes` (JSON, hashed), `verified`, `enabledAt`, `lastUsedAt`
- 5.2 `trustedDevices` Drizzle schema — `id`, `userId`, `deviceFingerprint`, `label`, `trustedUntil`, `createdAt`
- 5.3 `TwoFactorService` — `@Injectable()` with `generateSecret()`, `verifyToken()`, `enable()`, `disable()`, `generateBackupCodes()`, `verifyBackupCode()`, `trustDevice()`, `isDeviceTrusted()`
- 5.4 `TOTPProvider` — TOTP implementation (RFC 6238), QR code URI generation
- 5.5 `SMSTwoFactorProvider` — send OTP via SMS adapter
- 5.6 `EmailTwoFactorProvider` — send OTP via email service
- 5.7 `TwoFactorAdapter` interface — `sendSMS(phone, code)`, `sendEmail(email, code)`
- 5.8 `TwoFactorEnforcementPolicy` — per-org enforcement rules
- 5.9 `twoFactorMiddleware` — tRPC middleware enforcing 2FA on protected routes
- 5.10 `TwoFactorTrpc` — OOP router with `setup`, `verify`, `disable`, `generateBackupCodes`, `listTrustedDevices`, `removeTrustedDevice`
- 5.11 `TwoFactorModule` — `@Module` registration

### Adapters needed: Yes — SMS delivery per platform
- Cloudflare: Twilio REST API
- AWS: SNS
- GCP: Firebase Auth SMS
- Azure: Communication Services
- DigitalOcean: Twilio REST API
- Docker: Twilio REST API

### E2E test: `tests/e2e/tests/two-factor-auth.spec.ts`

---

## Feature 6: Magic Link / Passwordless (`packages/core/src/magic-link/`)

### Sub-features:
- 6.1 `magicLinks` Drizzle schema — `id`, `userId`, `email`, `token` (hashed), `expiresAt`, `usedAt`, `ipAddress`, `redirectTo`
- 6.2 `MagicLinkService` — `@Injectable()` with `generate()`, `verify()`, `consume()`, `cleanup()`
- 6.3 Token generation — crypto-secure random, SHA-256 hashed storage
- 6.4 Rate limiting — max N requests per email per hour
- 6.5 Email template — magic link email with branding
- 6.6 One-time use enforcement — mark consumed, reject reuse
- 6.7 Configurable expiry — default 15 minutes
- 6.8 Redirect-after-auth — configurable post-login redirect
- 6.9 `MagicLinkTrpc` — OOP router with `request`, `verify`
- 6.10 `MagicLinkModule` — `@Module` registration

### Adapters needed: None (uses existing email service)
### E2E test: `tests/e2e/tests/magic-link.spec.ts`

---

## Feature 7: Serializers / API Resources (`packages/core/src/resources/`)

### Sub-features:
- 7.1 `Resource<T>` abstract base class — `toJSON()`, `toArray()`, field mapping
- 7.2 `ResourceCollection<T>` — wraps arrays with pagination meta
- 7.3 `@Field()` decorator — mark properties for serialization, with `@Computed`, `@Hidden`, `@When(condition)`
- 7.4 Field selection — sparse fieldsets via `?fields=id,name,email`
- 7.5 Relationship embedding — `@Include('relation')` with lazy/eager loading
- 7.6 Conditional inclusion — `@When(() => ctx.user.isAdmin)` for admin-only fields
- 7.7 `ResourceTransformer` — transforms raw DB rows into API-safe shapes
- 7.8 `resourceMiddleware` — tRPC middleware applying resource transformation
- 7.9 `ResourceModule` — `@Module` registration

### Adapters needed: None (pure transformation logic)
### E2E test: `tests/e2e/tests/api-resources.spec.ts`

---

## Feature 8: API Versioning (`packages/core/src/versioning/`)

### Sub-features:
- 8.1 `ApiVersion` type — semver-compatible version identifiers
- 8.2 `VersionStrategy` — `URL_PATH` (`/v1/...`), `HEADER` (`Accept: application/vnd.api+json;version=1`), `QUERY_PARAM` (`?version=1`)
- 8.3 `VersionNegotiator` — resolve version from request using configured strategy
- 8.4 `@Version(version)` decorator — mark router/procedure version
- 8.5 `VersionedRouter` — extends `TrpcRouter` with version-aware routing
- 8.6 Deprecation warnings — `Sunset` header, `Deprecation` header (RFC 8594)
- 8.7 Version changelog — in-memory registry of versions and changes
- 8.8 `versionMiddleware` — tRPC middleware injecting version into context
- 8.9 `VersioningModule` — `@Module` registration

### Adapters needed: None (pure routing logic)
### E2E test: `tests/e2e/tests/api-versioning.spec.ts`

---

## Feature 9: Full-Text Search (`packages/core/src/search/`)

### Sub-features:
- 9.1 `SearchAdapter` interface — `index()`, `search()`, `remove()`, `flush()`, `createIndex()`
- 9.2 `SQLiteSearchAdapter` — FTS5 virtual tables for D1/SQLite
- 9.3 `SearchService` — `@Injectable()` with `search()`, `index()`, `reindex()`, `remove()`
- 9.4 `SearchQuery` builder — fluent API: `SearchQuery.for('users').where('role', 'admin').highlight().facet('department')`
- 9.5 `SearchResult<T>` type — `hits`, `total`, `facets`, `took`, `highlights`
- 9.6 `@Searchable()` decorator — mark entity fields for auto-indexing
- 9.7 Indexing pipeline — auto-index on create/update/delete via events
- 9.8 Faceted search — group results by field values
- 9.9 Highlighting — wrap matched terms in `<mark>` tags
- 9.10 `SearchTrpc` — OOP router with `search`, `reindex`
- 9.11 `SearchModule` — `@Module` registration
- 9.12 `SEARCH_ADAPTER` DI token with `@Optional()` fallback

### Adapters needed: Yes — search backend per platform
- Cloudflare: D1 FTS5
- AWS: OpenSearch / CloudSearch
- GCP: Firestore full-text / Typesense
- Azure: Cognitive Search
- DigitalOcean: PostgreSQL FTS / Typesense
- Docker: SQLite FTS5 / Meilisearch

### E2E test: `tests/e2e/tests/full-text-search.spec.ts`

---

## Feature 10: Error Reporting (`packages/monitor/src/error-reporting/`)

### Sub-features:
- 10.1 `ErrorReporterAdapter` interface — `capture(error, context)`, `captureMessage(msg, level)`, `setUser(user)`, `addBreadcrumb(crumb)`, `flush()`
- 10.2 `ConsoleErrorReporter` — default, logs to structured logger
- 10.3 `ErrorReportingService` — `@Injectable()` with `capture()`, `captureMessage()`, breadcrumbs trail, user context enrichment
- 10.4 `Breadcrumb` type — `category`, `message`, `level`, `timestamp`, `data`
- 10.5 `errorReportingMiddleware` — tRPC middleware auto-capturing errors with request context
- 10.6 Release tracking — attach version/commit to error reports
- 10.7 Error grouping — fingerprint generation for deduplication
- 10.8 Source map integration — configurable source map upload
- 10.9 `ErrorReportingModule` — `@Module` registration
- 10.10 `ERROR_REPORTER_ADAPTER` DI token

### Adapters needed: Yes — reporting backend per platform
- Cloudflare: Sentry SDK / Logpush
- AWS: CloudWatch + X-Ray
- GCP: Error Reporting API
- Azure: Application Insights
- DigitalOcean: Sentry SDK
- Docker: Sentry SDK (self-hosted)

### E2E test: `tests/e2e/tests/error-reporting.spec.ts`

---

## Feature 11: Multi-Database (`packages/core/src/multi-database/`)

### Sub-features:
- 11.1 `DatabaseConnection` type — `name`, `type` (primary|replica|analytics), `config`
- 11.2 `MultiDatabaseService` — `@Injectable()` with `connection(name)`, `primary()`, `replica()`, `transaction()`
- 11.3 Named connection registry — register multiple Drizzle instances
- 11.4 Read replica routing — `@UseConnection('replica')` decorator
- 11.5 Connection health monitoring — per-connection health checks
- 11.6 Transaction spanning — coordinate transactions across connections (best-effort, not distributed XA)
- 11.7 `MultiDatabaseModule` — `@Module` registration

### Adapters needed: Yes — connection factories per platform
- Cloudflare: Multiple D1 bindings
- AWS: RDS + Aurora read replicas
- GCP: Cloud SQL + read replicas
- Azure: Azure SQL + replicas
- DigitalOcean: Managed DB + read replicas
- Docker: Multiple SQLite files / PostgreSQL connections

### E2E test: `tests/e2e/tests/multi-database.spec.ts`

---

## Feature 12: Sitemaps (`packages/core/src/sitemaps/`)

### Sub-features:
- 12.1 `SitemapEntry` type — `url`, `lastmod`, `changefreq`, `priority`, `images?`, `videos?`
- 12.2 `SitemapService` — `@Injectable()` with `addStatic()`, `addDynamic()`, `generate()`, `generateIndex()`
- 12.3 `@SitemapRoute()` decorator — mark routes for inclusion with metadata
- 12.4 Static route collection — auto-discover from React Router routes
- 12.5 Dynamic route generation — callback-based for DB-driven URLs
- 12.6 Sitemap index — split large sitemaps (50k URL limit per file)
- 12.7 Image/video sitemaps — extended sitemap protocol
- 12.8 `robots.txt` integration — auto-reference sitemap URL
- 12.9 Auto-submit — ping Google/Bing on regeneration (configurable)
- 12.10 `SitemapModule` — `@Module` registration

### Adapters needed: None (generates XML, served via HTTP)
### E2E test: `tests/e2e/tests/sitemaps.spec.ts`

---

## Feature 13: Interactive Console (`packages/cli/`)

### Sub-features:
- 13.1 `cruz console` CLI command — launch REPL with full framework context
- 13.2 Auto-import DI container, DB, all services
- 13.3 `.services` helper — list all registered services
- 13.4 `.db` helper — shortcut to Drizzle instance
- 13.5 `.config` helper — access ConfigService
- 13.6 TypeScript evaluation via `tsx` / `ts-node`
- 13.7 Command history — persist across sessions
- 13.8 Tab completion for service names

### Adapters needed: None (CLI-only)
### E2E test: None (interactive CLI)

---

## Feature 14: Social Auth Enhancement (`packages/start/src/social-auth/`)

### Sub-features:
- 14.1 Full provider implementations — GitHub, Google, Discord, Twitter/X, LinkedIn, Microsoft, Apple
- 14.2 Account linking — connect multiple providers to one user
- 14.3 Token refresh — automatic OAuth token refresh
- 14.4 Profile sync — update user profile from provider data
- 14.5 Disconnect — unlink a provider from user account
- 14.6 Login-or-register flow — auto-create user on first social login
- 14.7 `SocialAuthTrpc` — router with `listProviders`, `connect`, `disconnect`, `callback`
- 14.8 `SocialAuthModule` — `@Module` registration

### Adapters needed: None (HTTP-based OAuth, platform-agnostic)
### E2E test: `tests/e2e/tests/social-auth.spec.ts`

---

## Feature 15: Observability / Tracing (`packages/monitor/src/tracing/`)

### Sub-features:
- 15.1 `TracingAdapter` interface — `startSpan()`, `endSpan()`, `setAttributes()`, `recordException()`, `getActiveSpan()`, `propagateContext()`
- 15.2 `InMemoryTracingAdapter` — default, stores spans in memory for dev
- 15.3 `TracingService` — `@Injectable()` with span creation, context propagation, trace ID generation
- 15.4 `Span` type — `traceId`, `spanId`, `parentSpanId`, `name`, `kind`, `startTime`, `endTime`, `attributes`, `events`, `status`
- 15.5 `@Trace()` decorator — auto-create spans for service methods
- 15.6 `tracingMiddleware` — tRPC middleware creating request spans
- 15.7 W3C Trace Context — `traceparent` / `tracestate` header propagation
- 15.8 Metrics service — counters, histograms, gauges
- 15.9 `MetricAdapter` interface — `increment()`, `histogram()`, `gauge()`
- 15.10 `TracingModule` — `@Module` registration
- 15.11 `TRACING_ADAPTER` and `METRIC_ADAPTER` DI tokens

### Adapters needed: Yes — tracing/metrics backend per platform
- Cloudflare: Workers Trace Events / Logpush
- AWS: X-Ray + CloudWatch Metrics
- GCP: Cloud Trace + Cloud Monitoring
- Azure: Application Insights
- DigitalOcean: Datadog / OTLP export
- Docker: Jaeger / OTLP export

### E2E test: `tests/e2e/tests/observability.spec.ts`

---

## Feature 16: Admin Dashboard (`packages/saas/src/admin/`)

### Sub-features:
- 16.1 `AdminResource` abstract class — define CRUD config per Drizzle table
- 16.2 Auto-generated list/detail/create/edit views from schema introspection
- 16.3 Column configuration — sortable, filterable, searchable, hidden
- 16.4 Filters — text, select, date range, boolean
- 16.5 Bulk actions — delete, export, custom actions
- 16.6 Custom actions — per-row or per-selection action buttons
- 16.7 Audit log viewer — integrated with audit logging module
- 16.8 User impersonation — sign in as another user (admin-only)
- 16.9 Dashboard widgets — stats, charts, recent activity
- 16.10 `AdminTrpc` — OOP router with generic CRUD, impersonation, dashboard stats
- 16.11 `AdminModule` — `@Module` registration

### Adapters needed: None (UI + tRPC)
### E2E test: `tests/e2e/tests/admin-dashboard.spec.ts`

---

## Feature 17: Billing (`packages/saas/src/billing/`)

### Sub-features:
- 17.1 `subscriptions` Drizzle schema — `id`, `orgId`, `planId`, `status`, `stripeSubscriptionId`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `trialEnd`
- 17.2 `plans` Drizzle schema — `id`, `name`, `stripePriceId`, `type` (flat|per_seat|usage), `amount`, `interval`, `features` (JSON), `limits` (JSON)
- 17.3 `invoices` Drizzle schema — `id`, `orgId`, `stripeInvoiceId`, `amount`, `status`, `paidAt`, `pdfUrl`
- 17.4 `usageRecords` Drizzle schema — `id`, `orgId`, `metric`, `quantity`, `timestamp`
- 17.5 `BillingService` — `@Injectable()` with `createCheckout()`, `createPortalSession()`, `cancelSubscription()`, `updatePlan()`, `recordUsage()`, `getInvoices()`
- 17.6 `BillingAdapter` interface — `createCheckout()`, `createPortalSession()`, `syncSubscription()`, `createUsageRecord()`
- 17.7 `StripeBillingAdapter` — Stripe SDK integration
- 17.8 Webhook handler — process Stripe events (invoice.paid, subscription.updated, etc.)
- 17.9 Trial periods — configurable trial duration
- 17.10 Seat-based pricing — per-member billing with proration
- 17.11 Usage metering — track and report usage metrics
- 17.12 Entitlement checks — `hasFeature()`, `withinLimit()`
- 17.13 `BillingTrpc` — OOP router with `getSubscription`, `createCheckout`, `getInvoices`, `getUsage`
- 17.14 `BillingModule` — `@Module` registration

### Adapters needed: Billing provider adapter (Stripe default, extensible)
### E2E test: `tests/e2e/tests/billing.spec.ts`

---

## Feature 18: Rich Text / Action Text (`packages/saas/src/rich-text/`)

### Sub-features:
- 18.1 `richTextContents` Drizzle schema — `id`, `entityType`, `entityId`, `field`, `body` (HTML), `plainText`, `metadata` (JSON)
- 18.2 `richTextAttachments` Drizzle schema — `id`, `contentId`, `fileName`, `fileSize`, `contentType`, `storageKey`, `width`, `height`
- 18.3 `RichTextService` — `@Injectable()` with `save()`, `get()`, `getAttachments()`, `delete()`, `search()`
- 18.4 HTML sanitization — allowlist-based, strip XSS vectors
- 18.5 Attachment upload — R2/S3 storage via existing upload service
- 18.6 Mention support — `@user` references resolved to links
- 18.7 Image processing — resize/optimize on upload
- 18.8 `RichTextTrpc` — OOP router with `save`, `get`, `uploadAttachment`
- 18.9 `RichTextModule` — `@Module` registration

### Adapters needed: None (uses existing storage adapters)
### E2E test: `tests/e2e/tests/rich-text.spec.ts`

---

## Adapter Matrix

| Feature | CF | AWS | GCP | Azure | DO | Docker |
|---------|----|----|-----|-------|----|--------|
| Session Management | KV | DynamoDB | Firestore | Table Storage | Redis | Redis |
| Audit Logging | D1 | CloudWatch | Cloud Logging | App Insights | DB | DB |
| Two-Factor (SMS) | Twilio | SNS | Firebase | Comm Services | Twilio | Twilio |
| Full-Text Search | D1 FTS5 | OpenSearch | Firestore | Cognitive Search | PG FTS | SQLite FTS5 |
| Error Reporting | Sentry | X-Ray | Error Reporting | App Insights | Sentry | Sentry |
| Multi-Database | D1 × N | RDS replicas | Cloud SQL | Azure SQL | Managed DB | PG/SQLite |
| Observability | Trace Events | X-Ray | Cloud Trace | App Insights | OTLP | Jaeger/OTLP |
| Billing | Stripe | Stripe | Stripe | Stripe | Stripe | Stripe |

---

## Implementation Order (by wave)

### Wave 1 — Foundational (no dependencies)
1. Pagination
2. Soft Deletes
3. Serializers / API Resources
4. API Versioning

### Wave 2 — Auth & Security
5. Session Management
6. Audit Logging
7. Two-Factor Auth
8. Magic Link / Passwordless

### Wave 3 — Infrastructure
9. Full-Text Search
10. Error Reporting
11. Multi-Database
12. Observability / Tracing

### Wave 4 — DX & Content
13. Sitemaps
14. Interactive Console
15. Social Auth Enhancement
16. Rich Text

### Wave 5 — Premium
17. Admin Dashboard
18. Billing
