/// <reference path="./cloudflare.d.ts" />
/**
 * Cloudflare Pages Server Handler
 *
 * Uses createCruzApp() for unified fetch/queue/scheduled handling.
 */

import * as schema from './database/schema';
import { createCruzApp } from '@cruzjs/core/framework/create-cruz-app';
import { ScheduledJobsService } from '@cruzjs/core/jobs/scheduled-jobs.service';
import { StartModule } from '@cruzjs/start/start.module';
import { Module } from '@cruzjs/core/di';
import { JOB_HANDLER } from '@cruzjs/core/jobs/job.module';
import { HelloWorldJobHandler } from '@/jobs/hello-world.handler';
import { MaintenanceModule } from '@cruzjs/core/maintenance';
import { SchedulerModule } from '@cruzjs/core/scheduler';
import { FeatureFlagModule } from '@cruzjs/core/feature-flags';
import { WebhookModule } from '@cruzjs/core/webhooks';
import { BroadcastModule } from '@cruzjs/core/broadcasting';
import { RateLimitModule } from '@cruzjs/core/rate-limiting';
import { SessionModule } from '@cruzjs/core/sessions';
import { AuditModule } from '@cruzjs/core/audit';
import { TwoFactorModule } from '@cruzjs/core/two-factor';
import { MagicLinkModule } from '@cruzjs/core/magic-link';
import { SearchModule } from '@cruzjs/core/search';
import { MultiDatabaseModule } from '@cruzjs/core/multi-database';
import { SitemapModule } from '@cruzjs/core/sitemaps';
import { PaginationModule } from '@cruzjs/core/pagination';
import { SoftDeleteModule } from '@cruzjs/core/soft-delete';
import { VersioningModule } from '@cruzjs/core/versioning';
import { ApiModule } from '@cruzjs/core/api';
import { ErrorReportingModule } from '@cruzjs/monitor/error-reporting';
import { TracingModule } from '@cruzjs/monitor/tracing';
import { AdminModule } from '@cruzjs/saas/admin/admin.module';
import { BillingModule } from '@cruzjs/saas/billing/billing.module';
import { RichTextModule } from '@cruzjs/saas/rich-text/rich-text.module';

@Module({
  providers: [
    { provide: JOB_HANDLER, useClass: HelloWorldJobHandler, multi: true },
  ],
})
class AppModule {}

export default createCruzApp({
  schema,
  modules: [
    StartModule,
    MaintenanceModule,
    SchedulerModule,
    FeatureFlagModule,
    WebhookModule,
    BroadcastModule,
    RateLimitModule,
    SessionModule,
    AuditModule,
    TwoFactorModule,
    MagicLinkModule,
    SearchModule,
    MultiDatabaseModule,
    SitemapModule,
    PaginationModule,
    SoftDeleteModule,
    VersioningModule,
    ApiModule,
    ErrorReportingModule,
    TracingModule,
    AdminModule,
    BillingModule,
    RichTextModule,
    AppModule,
  ],

  // Pages — React Router SSR (virtual module resolved by Vite at build time)
  pages: () => import('virtual:react-router/server-build'),

  // Scheduled (cron) handlers
  scheduled: [
    {
      cron: '0 * * * *',
      handler: async (container) => {
        const svc = container.get(ScheduledJobsService);
        await svc.runAllCleanupTasks();
      },
    },
  ],
});
