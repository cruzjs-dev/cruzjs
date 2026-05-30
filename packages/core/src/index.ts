/**
 * @cruzjs/core - Open Source Core Package
 *
 * Contains: Auth, Sessions, DI, Events, Jobs, Email, Upload infrastructure
 *
 * RECOMMENDED SUB-PATH IMPORTS (prefer these over importing from the main barrel):
 *
 *   @cruzjs/core/di              - Dependency injection (Injectable, Inject, Module, CruzContainer)
 *   @cruzjs/core/trpc/context    - tRPC procedures (protectedProcedure, orgProcedure, router)
 *   @cruzjs/core/trpc/client     - tRPC client (getTRPC)
 *   @cruzjs/core/trpc/routers    - Router registration types
 *   @cruzjs/core/trpc/router-class - Class-based router decorators
 *   @cruzjs/core/api             - REST API decorators and utilities
 *   @cruzjs/core/routing         - Route helpers and registration
 *   @cruzjs/core/validation      - Zod schema factories
 *   @cruzjs/core/crud            - CRUD ViewSet factory
 *   @cruzjs/core/policies        - Object-level authorization
 *   @cruzjs/core/events          - Domain event system
 *   @cruzjs/core/testing         - Test utilities (createTestContainer, createTestDb, etc.)
 *   @cruzjs/core/database/factories - Database factory definitions
 *   @cruzjs/core/database/seeding   - Seeder utilities
 *   @cruzjs/core/resources       - API resource serializers
 *   @cruzjs/core/broadcasting    - Real-time broadcasting
 *   @cruzjs/core/feature-flags   - Feature flag system
 *   @cruzjs/core/health          - Health checks
 *   @cruzjs/core/http-client     - HTTP client
 *   @cruzjs/core/i18n            - Internationalization
 *   @cruzjs/core/logging         - Structured logging
 *   @cruzjs/core/maintenance     - Maintenance mode
 *   @cruzjs/core/rate-limiting   - Rate limiting
 *   @cruzjs/core/scheduler       - Task scheduling
 *   @cruzjs/core/webhooks        - Webhook delivery
 *   @cruzjs/core/runtime         - Provider-agnostic runtime interfaces
 *   @cruzjs/core/export          - CSV/Excel export & import
 *   @cruzjs/core/internal        - Internal APIs for @cruzjs/start and @cruzjs/saas (unstable)
 */

// DI
export { Injectable, Inject, Module, MultiInject, Optional } from './di';
export type { ModuleClass } from './di';

// Auth interfaces
export * from './auth/interfaces/user-hydrator.interface';

// Auth events
export { IdentityCreatedEvent } from './auth/events/identity-created.event';

// Framework
export {
  buildContainerWithModules,
  buildContainerWithProviders,
  getOrBuildContainer,
  resetContainerCache,
} from './framework/application.server';
export { registerModules, getRegisteredModules } from './framework/module-registry';
export { RouteRegistry } from './framework/route-registry';
export { createCruzApp } from './framework/create-cruz-app';
export type { CruzAppConfig, ScheduledHandler } from './framework/create-cruz-app';
export { configureCruzApp } from './framework/configure-cruz-app';
export type { ConfigureCruzAppConfig } from './framework/configure-cruz-app';
export type { QueueHandler } from './framework/local-queue-registry';
export { autoDiscoverModules, autoDiscoverSchemas } from './framework/auto-discover';
export type { ViteGlob } from './framework/auto-discover';
export { createFeature } from './framework/create-feature';
export type { CreateFeatureOptions } from './framework/create-feature';

// Shared Infrastructure
export { DRIZZLE, type DrizzleDatabase, DrizzleService, type CruzDatabase, type AnyDialectDatabase, DrizzleCruzDatabase } from './shared/database/drizzle.service';
export { LocalDb } from './shared/database/local-db';
export { ScopedDb, createScopedDb } from './shared/database/scoped-db';
export type { ScopedDbOptions } from './shared/database/scoped-db';
export { EventEmitterService } from './shared/events/event-emitter.service.server';
export { AppEvent } from './shared/events/event';
export { defineEventListener } from './shared/events/define-listener';
export type { EventListenerDef } from './shared/events/define-listener';
export { KVCacheService, KVCacheServiceFactory } from './shared/cloudflare/kv-cache.service';
export { CacheService, CacheServiceFactory } from './shared/redis/cache.service';
export type { ICacheService, ITaggedCache } from './shared/cache/cache.interface';
export { TaggedCache } from './shared/cache/tagged-cache';
export { Logger, LOG_ADAPTER } from './logging/logger.service';
export type { LogAdapter } from './logging/log.adapter';
export type { LogLevel, LogEntry, LogChannel } from './logging/log.types';
export { LOG_LEVEL_SEVERITY } from './logging/log.types';
export { JsonLogFormatter } from './logging/formatters/json.formatter';
export { PrettyLogFormatter } from './logging/formatters/pretty.formatter';
export { generateCorrelationId, createRequestLogger, getCorrelationId } from './logging/logging.middleware';
export { LoggingModule } from './logging/logging.module';
export { LogContext } from './logging/log-context';
export type { LogContextStore, LoggingConfig, LoggerFactory } from './logging/log.types';
export { LOGGER_FACTORY, LOGGING_CONFIG } from './logging/log.types';
export { ConfigService } from './shared/config/config.service';
export { getConfig, config } from './shared/config';

// tRPC
export { router, publicProcedure, protectedProcedure, orgProcedure, createContext } from './trpc/context';
export { handleTRPCRequest, getAppRouter } from './trpc/handler';
export { loader as trpcLoader, action as trpcAction, createTRPCLoaderHandler, createTRPCActionHandler } from './trpc/trpc.route';
export { TrpcRouter, Router, Route } from './trpc/router-class';
export type { RouterProcedures } from './trpc/router-class';

// Extended tRPC Procedure Builders
export {
  paginatedPublicProcedure,
  paginatedProcedure,
  orgPaginatedProcedure,
  cursorPaginatedPublicProcedure,
  cursorPaginatedProcedure,
  orgCursorPaginatedProcedure,
  rateLimitedPublicProcedure,
  rateLimitedProcedure,
  orgRateLimitedProcedure,
  versionedPublicProcedure,
  versionedAuthProcedure,
  orgVersionedProcedure,
  rateLimitedPaginatedProcedure,
  orgRateLimitedPaginatedProcedure,
} from './trpc/procedures';

// tRPC Middleware Pipeline
export { createPipeline } from './trpc/pipeline';

// Permission-Checked tRPC Procedure Builders
export { orgQuery, orgMutation, orgSubscription } from './trpc/checked-procedures';

// Jobs
export { JOB_HANDLER } from './jobs/job.module';
export type { JobHandler, JobHandlerMetadata, JobResult } from './jobs/job.types';

// Email
export { EmailService, EMAIL_SERVICE } from './email/email.service';
export { EmailTemplateRegistry } from './email/email-template.registry';
export type { EmailTemplateDefinition } from './email/email-template.registry';

// AI
export { AIService, type ExtractionOptions } from './ai/ai.service';
export { AIModule } from './ai/ai.module';

// Resources (API response transformers / serializers)
export {
  Resource,
  ResourceCollection,
  buildPaginationMeta,
  paginate,
  Field,
  Computed,
  Hidden,
  When,
  Include,
  getResourceFields,
  ResourceTransformer,
  resourceMiddleware,
  ResourceModule,
} from './resources';
export type {
  PaginatedResponse,
  PaginationLinks,
  PaginationMeta,
  ResourceOptions,
  FieldOptions,
  IncludeOptions,
  SerializationContext,
} from './resources';

// HTTP Client
export { HttpClient, HttpResponse, HttpError, Http, HttpClientModule } from './http-client';
export type { HttpMethod as HttpClientMethod, HttpClientConfig, RequestInterceptor, ResponseInterceptor } from './http-client';

// Rate Limiting
export {
  RateLimitService,
  RATE_LIMIT_ADAPTER,
  RateLimitModule,
  SlidingWindowRateLimitAdapter,
  FixedWindowRateLimitAdapter,
  rateLimitMiddleware,
  rateLimitHeaders,
  RateLimit,
  getRateLimitMetadata,
} from './rate-limiting';
export type {
  RateLimitResult,
  RateLimitConfig,
  NamedLimiter,
  RateLimitAdapter,
  RateLimitKeyExtractor,
  RateLimitDecoratorConfig,
} from './rate-limiting';

// Scheduler
export {
  Schedule,
  SchedulerService,
  SCHEDULER_ADAPTER,
  SchedulerTrpc,
  SchedulerModule,
  defineSchedule,
  scheduledTasks,
  scheduledTaskRuns,
  runTaskSchema,
  taskHistorySchema,
  toggleTaskSchema,
} from './scheduler';
export type {
  TaskStatus,
  TaskRunStatus,
  ScheduledTaskConfig,
  TaskRunResult,
  ScheduledTaskInfo,
  TaskRunInfo,
  SchedulerAdapter,
  ScheduledTask,
  NewScheduledTask,
  ScheduledTaskRun,
  NewScheduledTaskRun,
  RunTaskInput,
  TaskHistoryInput,
  ToggleTaskInput,
} from './scheduler';

// Health Checks
export { HEALTH_CHECK } from './health/health.types';
export { HealthCheckService } from './health/health-check.service';
export { HealthTrpc } from './health/health.trpc';
export { HealthModule } from './health/health.module';
export { DatabaseHealthCheck } from './health/checks/database.check';
export { CacheHealthCheck } from './health/checks/cache.check';
export { StorageHealthCheck } from './health/checks/storage.check';
export type {
  HealthCheck,
  HealthCheckComponentResult,
  HealthCheckResponse,
} from './health/health-check.interface';

// Maintenance Mode
export { MaintenanceService } from './maintenance/maintenance.service';
export { MaintenanceTrpc } from './maintenance/maintenance.trpc';
export { MaintenanceModule } from './maintenance/maintenance.module';
export { withMaintenanceCheck, buildBypassCookieHeader } from './maintenance/maintenance.middleware';
export { enableMaintenanceSchema } from './maintenance/maintenance.validation';
export type { EnableMaintenanceInput } from './maintenance/maintenance.validation';
export type { MaintenanceState, MaintenanceStatus } from './maintenance/maintenance.types';
export {
  DEFAULT_MAINTENANCE_STATE,
  MAINTENANCE_STATE_KEY,
  MAINTENANCE_BYPASS_COOKIE,
} from './maintenance/maintenance.types';

// Feature Flags
export {
  FeatureFlagService,
  FEATURE_FLAG_ADAPTER,
  FeatureFlagTrpc,
  FeatureFlagModule,
  featureFlags,
  featureFlagSegments,
  featureFlagOverrides,
  createFlagSchema,
  updateFlagSchema,
  setSegmentsSchema,
  evaluateSchema,
  evaluateBoolean,
  evaluatePercentage,
  hashToBucket,
  evaluateSegments,
  evaluateSegmentCondition,
} from './feature-flags';
export type {
  FlagType,
  SegmentOperator,
  FlagEvaluationContext,
  FlagEvaluationResult,
  FeatureFlagAdapter,
  FeatureFlag,
  NewFeatureFlag,
  FeatureFlagSegment,
  NewFeatureFlagSegment,
  FeatureFlagOverride,
  NewFeatureFlagOverride,
  CreateFlagInput,
  UpdateFlagInput,
  SetSegmentsInput,
  EvaluateInput,
} from './feature-flags';

// i18n / Localization
export { I18nService, I18nFormatter, I18nModule, TranslationLoader, detectLocaleFromRequest, interpolate, pluralize } from './i18n';
export type { Locale, TranslationMap, I18nConfig, FormatOptions, ScopedTranslator, I18nContextValue } from './i18n';

// Webhooks
export {
  WebhookService,
  WebhookTrpc,
  WebhookModule,
  WebhookDeliveryJobHandler,
  signPayload,
  verifySignature,
  generateSecret,
  verifyWebhookRequest,
  webhooks,
  webhookDeliveries,
  createWebhookSchema,
  updateWebhookSchema,
  WEBHOOK_RETRY_DELAYS_MS,
  MAX_WEBHOOK_ATTEMPTS,
  getRetryDelayMs,
} from './webhooks';
export type {
  WebhookStatus,
  WebhookEventType,
  WebhookPayload,
  WebhookDeliveryResult,
  Webhook,
  NewWebhook,
  WebhookDelivery,
  NewWebhookDelivery,
  CreateWebhookInput,
  UpdateWebhookInput,
} from './webhooks';

// Broadcasting
export {
  BroadcastChannel,
  PublicChannel,
  PrivateChannel,
  PresenceChannel,
  channel,
  privateChannel,
  presenceChannel,
  BroadcastEvent,
  BroadcastService,
  BROADCAST_ADAPTER,
  BroadcastAuthService,
  SSEConnectionRegistry,
  sseRegistry,
  createSSEResponse,
  SSE_BACKEND,
  InMemorySSEBackend,
  defaultSSEBackend,
  KVSSEBackend,
  DatabaseSSEBackend,
  BroadcastTrpc,
  BroadcastModule,
  broadcastPresence,
  broadcastMessages,
  channelAuthSchema,
  presenceChannelSchema,
  joinPresenceSchema,
  leavePresenceSchema,
} from './broadcasting';
export type {
  ChannelType,
  BroadcastMessage,
  PresenceMember,
  BroadcastSubscription,
  BroadcastAdapter,
  ChannelAuthHandler,
  SSEBackend,
  SSEController,
  BroadcastPresenceRecord,
  NewBroadcastPresenceRecord,
  BroadcastMessageRecord,
  NewBroadcastMessageRecord,
  ChannelAuthInput,
  PresenceChannelInput,
  JoinPresenceInput,
  LeavePresenceInput,
} from './broadcasting';

// Sessions
export {
  SessionService,
  SESSION_ADAPTER,
  DEFAULT_SESSION_CONFIG,
  DatabaseSessionAdapter,
  generateDeviceFingerprint,
  parseDeviceLabel,
  SessionTrpc,
  SessionModule,
  managedSessions,
  revokeSessionSchema,
} from './sessions';
export type {
  SessionData,
  CreateSessionInput,
  SessionConfig,
  SessionAdapter,
  ManagedSession,
  NewManagedSession,
  RevokeSessionInput,
} from './sessions';

// Soft Delete
export {
  SoftDeleteService,
  SoftDeleteModule,
  SoftDeleteScope,
  softDeleteColumns,
  softDeleteMiddleware,
} from './soft-delete';
export type {
  SoftDeletable,
  SoftDeleteOptions,
} from './soft-delete';

// Pagination
export {
  PaginationService,
  PaginationModule,
  PaginationType,
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  DEFAULT_CURSOR_LIMIT,
  MAX_CURSOR_LIMIT,
  offsetPaginationSchema,
  cursorPaginationSchema,
  paginationSchema,
  paginatedMiddleware,
  cursorPaginatedMiddleware,
  paginatedResponse,
  cursorPaginatedResponse,
} from './pagination';
export type {
  OffsetPaginationParams,
  CursorPaginationParams,
  CursorDirection,
  OffsetPaginationMeta,
  CursorPaginationMeta,
  PaginationLinks as PaginationLinksV2,
  PaginatedResult,
  OffsetPaginateOptions,
  CursorPaginateOptions,
  OffsetPaginationInput,
  CursorPaginationInput,
  PaginationInput,
} from './pagination';

// API Versioning
export {
  VersionNegotiator,
  VersioningService,
  VersioningModule,
  VersionStrategyEnum,
  DEFAULT_VERSION_CONFIG,
  Version,
  Deprecated,
  getVersionMetadata,
  isDeprecated,
  getDeprecatedSunsetDate,
  versionMiddleware,
  versionedProcedure,
  versionHeaders,
} from './versioning';
export type {
  ApiVersion,
  VersionStrategy,
  VersionConfig,
  VersionInfo,
} from './versioning';

// Magic Link / Passwordless Auth
export {
  MagicLinkService,
  MagicLinkTrpc,
  MagicLinkModule,
  magicLinks,
  buildMagicLinkEmail,
  requestMagicLinkSchema,
  verifyMagicLinkSchema,
  DEFAULT_MAGIC_LINK_CONFIG,
} from './magic-link';
export type {
  MagicLink,
  RequestMagicLinkInput as MagicLinkRequestInput,
  VerifyMagicLinkResult,
  MagicLinkConfig,
  MagicLinkRow,
  NewMagicLinkRow,
  MagicLinkEmailOptions,
  VerifyMagicLinkInput,
} from './magic-link';

// Audit Logging
export {
  AuditLogService,
  AuditLogTrpc,
  AuditModule,
  DatabaseAuditAdapter,
  AuditAction,
  AuditActorType,
  AUDIT_LOG_ADAPTER,
  auditLogs,
  auditLogQuerySchema,
  entityHistorySchema,
  actorHistorySchema,
  auditActionValues,
  auditMiddleware,
  Auditable,
} from './audit';
export type {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogQuery,
  AuditLogAdapter,
  AuditLog,
  NewAuditLog,
  AuditLogQueryInput,
  EntityHistoryInput,
  ActorHistoryInput,
} from './audit';

// Full-Text Search
export {
  SearchService,
  SEARCH_ADAPTER,
  SearchModule,
  SQLiteFTSAdapter,
  SearchQueryBuilder,
  SearchIndexingPipeline,
  SearchTrpc,
  Searchable,
  SearchField,
  getSearchableMetadata,
  getSearchFieldMetadata,
  searchOptionsSchema,
  reindexSchema,
} from './search';
export type {
  SearchHit,
  SearchFacet,
  SearchResult,
  IndexedDocument,
  SearchOptions,
  IndexOptions,
  SearchAdapter,
  SearchableMetadata,
  SearchFieldMetadata,
  IndexingHandler,
  SearchOptionsInput,
  ReindexInput,
} from './search';

// Multi-Database
export {
  MultiDatabaseService,
  MultiDatabaseHealthCheck,
  MultiDatabaseModule,
  ConnectionRole,
  UseConnection,
  getConnectionRoute,
} from './multi-database';
export type {
  ConnectionInfo,
  DatabaseConnectionConfig,
  MultiDatabaseConfig,
} from './multi-database';

// Two-Factor Authentication
export {
  TwoFactorMethod,
  TWO_FACTOR_ADAPTER,
  TwoFactorService,
  TwoFactorTrpc,
  TwoFactorModule,
  TOTPProvider,
  twoFactorSecrets,
  trustedDevices,
  twoFactorMiddleware,
  TwilioTwoFactorAdapter,
  EmailTwoFactorAdapter,
  verifySetupSchema,
  disableSchema,
  verifyCodeSchema,
  revokeTrustedDeviceSchema,
  trustDeviceSchema,
  sendOTPSchema,
  base32Encode,
  base32Decode,
  timingSafeEqual,
} from './two-factor';
export type {
  TwoFactorSecret,
  TrustedDevice,
  BackupCode,
  TOTPSetupResult,
  TwoFactorStatus,
  TwoFactorAdapter,
  TwoFactorPolicy,
  TwoFactorSecretRow,
  NewTwoFactorSecret,
  TrustedDeviceRow,
  NewTrustedDevice,
  VerifySetupInput,
  DisableInput,
  VerifyCodeInput,
  RevokeTrustedDeviceInput,
  TrustDeviceInput,
  SendOTPInput,
} from './two-factor';

// Sitemaps
export {
  SitemapBuilder,
  SitemapService,
  SitemapModule,
  SitemapRoute,
  getSitemapRouteMetadata,
  handleSitemapRequest,
  ChangeFrequency,
  DEFAULT_SITEMAP_CONFIG,
} from './sitemaps';
export type {
  SitemapEntry,
  SitemapImage,
  SitemapConfig,
  DynamicSitemapProvider,
  SitemapRouteMetadata,
} from './sitemaps';

// REST API Routers
export {
  ApiRouter,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Head,
  Options,
  HttpCode,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Session,
  Ip,
  isApiRouter,
  isController,
  getApiRouterMetadata,
  getControllerMetadata,
  getRouteMetadata,
  getParamMetadata,
  getApiRouterRouteKeys,
  getControllerRouteKeys,
  ApiResponse,
  ApiRouterDispatcher,
  ControllerDispatcher,
  ApiRouterBase,
  handleApiRequest,
  getApiRouterDispatcher,
  getControllerDispatcher,
  createApiLoaderHandler,
  createApiActionHandler,
  ApiModule,
  HttpMethod,
  HttpStatus,
} from './api';
export type {
  ApiRouterMetadata,
  ApiControllerMetadata,
  ApiRouteMetadata,
  ApiParamMetadata,
  ApiRouteEntry,
  ControllerRouteEntry,
  ApiContext,
  ApiErrorResponse,
  ApiSuccessResponse,
} from './api';

// Policies (object-level authorization)
export { definePolicy, enforce, can, cannot, buildPolicyContext, withPolicy } from './policies';
export type { PolicyContext, PolicyAbility, PolicyFn, ResourcePolicy, ResourceLoader } from './policies';

// CRUD (DRF-style ViewSet factory)
export { createCrud, BaseCrudService, defineFilters, FiltersConfig } from './crud';
export type { CrudScope, CrudConfig, CrudListOptions, CrudCtx, CrudHooks, CrudPermissions, CrudPolicies, BaseCrudServiceConfig, FilterOp } from './crud';

// Database Factories
export { defineFactory } from './database/factories/factory';
export type { Factory } from './database/factories/factory';

// Database Relationship Helpers
export { hasMany, belongsTo, manyToMany, withRelations } from './database/relations';
export type { HasManyRelation, BelongsToRelation, ManyToManyRelation } from './database/relations';

// Database Query Scopes
export { defineScope, applyScopes, softNotDeleted, createdAfter, byOrg, byUser } from './database/scopes';
export type { Scope } from './database/scopes';

// Database Seeding
export { runSeeders } from './database/seeding/run-seeders';
export type { Seeder, SeederClass } from './database/seeding/seeder';

// Image Processing
export {
  ImageService,
  IMAGE_PROCESSOR,
  NoOpImageProcessor,
  ImageModule,
} from './image';
export type {
  ImageFormat,
  ResizeOptions,
  CropOptions,
  ConvertOptions,
  IImageProcessor,
} from './image';

// PDF Generation
export {
  PdfService,
  PDF_GENERATOR,
  NoOpPdfGenerator,
  PdfModule,
} from './pdf';
export type {
  PdfMargin,
  PdfPageFormat,
  PdfOptions,
  IPdfGenerator,
} from './pdf';

// Upload & Image Transforms
export { UploadService, UploadModule, ImageTransformService } from './upload';
export type { ImageTransformOptions, ImageTransformResult } from './upload';

// Flash Messages
export {
  FlashService,
  FlashModule,
  FLASH_COOKIE_NAME,
} from './flash';
export type {
  FlashLevel,
  FlashMessage,
} from './flash';

// Signed URLs
export { SignedUrlService } from './shared/signed-urls/signed-url.service';
export type { SignedUrlOptions, SignedUrlVerification } from './shared/signed-urls/signed-url.service';

// Idempotency
export { IdempotencyService, withIdempotency } from './shared/idempotency/idempotency.service';
export type { IdempotencyRecord } from './shared/idempotency/idempotency.service';

// Export / Import (CSV + Excel)
export { ExportService, ImportService } from './export';
export type { ExportColumn, ExportOptions, ImportResult, ImportError } from './export';

// Model Observers (Database Lifecycle Hooks)
export { ObserverRegistry } from './database/observers/observer.registry';
export { withObservers } from './database/observers/with-observers';
export type { ObservedDb } from './database/observers/with-observers';
export type { IModelObserver } from './database/observers/observer.interface';
export { Observable, getObservableTable } from './database/observers/observable.decorator';

// N+1 Query Detection (dev-only)
export { N1Detector } from './database/n1-detector';

// Encrypted Columns
export { EncryptedColumn } from './database/encrypted-column';

// Validation
export { createValidationSchemas } from './validation/schema-factory';

// Runtime (provider-agnostic interfaces)
export type {
  CacheBinding,
  QueueBinding,
  QueueConsumerMessage,
  AIBinding,
  AIChatOptions,
  AISentimentResult,
  AIExtractOptions,
  RuntimeType,
  RuntimeAdapter,
  LocalQueueLike,
} from './runtime';
