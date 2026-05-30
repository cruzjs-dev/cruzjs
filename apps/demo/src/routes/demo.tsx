type Feature = {
  name: string;
  category: string;
  description: string;
  module: string;
  trpc?: string[];
};

const features: Feature[] = [
  {
    name: 'Authentication',
    category: 'Core',
    description: 'Email/password, magic links, 2FA (TOTP + SMS), and social OAuth (GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple).',
    module: '@cruzjs/core/auth + MagicLinkModule + TwoFactorModule',
    trpc: ['auth.login', 'auth.register', 'magicLink.request', 'magicLink.verify', 'twoFactor.setupTOTP', 'twoFactor.verifyTOTP', 'socialAuth.getAvailableProviders'],
  },
  {
    name: 'Organizations & RBAC',
    category: 'Core',
    description: 'Multi-tenant organizations with members, roles (OWNER/ADMIN/MEMBER/VIEWER), invitations, and permission checks.',
    module: 'StartModule → OrgModule',
    trpc: ['org.create', 'org.list', 'member.list', 'member.invite', 'member.updateRole'],
  },
  {
    name: 'User Profiles',
    category: 'Core',
    description: 'User profile management, avatar uploads, password changes, and account settings.',
    module: 'StartModule → UserProfileModule',
    trpc: ['userProfile.current', 'userProfile.update', 'userProfile.changePassword'],
  },
  {
    name: 'Session Management',
    category: 'Core',
    description: 'KV-backed session storage with device tracking, concurrent sessions, and remote revocation.',
    module: 'SessionModule',
    trpc: ['session.listSessions', 'session.getCurrentSession', 'session.revokeSession', 'session.revokeAllSessions'],
  },
  {
    name: 'Notifications',
    category: 'Communication',
    description: 'Multi-channel notifications: in-app, email, Slack, Web Push (VAPID), SMS (Twilio), and webhooks. Per-user opt-out preferences.',
    module: 'StartModule → NotificationModule',
    trpc: ['notification.getNotifications', 'notification.markRead', 'notification.getPushKey', 'notification.subscribePush', 'notification.updatePreference'],
  },
  {
    name: 'Broadcasting / SSE',
    category: 'Communication',
    description: 'Server-Sent Events for real-time updates. Presence tracking via KV. KVSSEBackend on Cloudflare, Redis pub/sub on Docker.',
    module: 'BroadcastModule',
    trpc: ['broadcast.publish', 'broadcast.getPresence'],
  },
  {
    name: 'Social Auth (OAuth)',
    category: 'Auth',
    description: '7 OAuth providers via OAUTH_PROVIDER multi-injection. Routes: /auth/:provider and /auth/:provider/callback.',
    module: 'StartModule → SocialAuthModule',
    trpc: ['socialAuth.getAvailableProviders', 'socialAuth.getAuthUrl', 'socialAuth.getConnectedAccounts', 'socialAuth.disconnectAccount'],
  },
  {
    name: 'API Keys',
    category: 'Platform',
    description: 'Programmatic API access with scoped keys, token hashing, and middleware for key-based auth.',
    module: 'StartModule → ApiKeyModule',
    trpc: ['apiKey.create', 'apiKey.list', 'apiKey.revoke'],
  },
  {
    name: 'Feature Flags',
    category: 'Platform',
    description: 'Per-org feature toggles with percentage rollouts, user targeting, and environment overrides.',
    module: 'FeatureFlagModule',
    trpc: ['featureFlag.list', 'featureFlag.create', 'featureFlag.evaluate', 'featureFlag.update'],
  },
  {
    name: 'Webhooks',
    category: 'Platform',
    description: 'Outbound webhook management with retry logic, delivery logs, HMAC signing, and test delivery.',
    module: 'WebhookModule',
    trpc: ['webhook.create', 'webhook.list', 'webhook.delete', 'webhook.test', 'webhook.deliveries'],
  },
  {
    name: 'Rate Limiting',
    category: 'Infrastructure',
    description: 'Distributed rate limiting via KV (Cloudflare) or Redis (Docker). Read-modify-write window algorithm.',
    module: 'RateLimitModule',
    trpc: ['rateLimit.check'],
  },
  {
    name: 'Scheduler',
    category: 'Infrastructure',
    description: 'Cron-based task scheduling with distributed locking (KV on CF, Redis on Docker). Prevents duplicate execution.',
    module: 'SchedulerModule',
    trpc: ['scheduler.list', 'scheduler.create', 'scheduler.pause', 'scheduler.delete'],
  },
  {
    name: 'Audit Logging',
    category: 'Compliance',
    description: 'Comprehensive audit trail for all user/system actions. D1-backed with Logpush support on Cloudflare.',
    module: 'AuditModule',
    trpc: ['audit.list', 'audit.search'],
  },
  {
    name: 'Full-Text Search',
    category: 'Platform',
    description: 'FTS5 search on Cloudflare D1/SQLite. OpenSearch/Elasticsearch on container adapters.',
    module: 'SearchModule',
    trpc: ['search.query', 'search.index', 'search.remove'],
  },
  {
    name: 'Multi-Database',
    category: 'Infrastructure',
    description: 'Connect multiple D1 databases or external DBs with automatic migration and cross-database queries.',
    module: 'MultiDatabaseModule',
    trpc: ['multiDatabase.list', 'multiDatabase.query'],
  },
  {
    name: 'Maintenance Mode',
    category: 'Platform',
    description: 'Toggle maintenance mode with custom messages. Bypass tokens for admin access during maintenance.',
    module: 'MaintenanceModule',
    trpc: ['maintenance.getStatus', 'maintenance.enable', 'maintenance.disable'],
  },
  {
    name: 'Magic Links',
    category: 'Auth',
    description: 'Passwordless authentication via time-limited magic link tokens sent by email.',
    module: 'MagicLinkModule',
    trpc: ['magicLink.request', 'magicLink.verify'],
  },
  {
    name: 'Two-Factor Auth',
    category: 'Auth',
    description: 'TOTP (authenticator app), SMS backup codes, and trusted device management.',
    module: 'TwoFactorModule',
    trpc: ['twoFactor.getStatus', 'twoFactor.setupTOTP', 'twoFactor.verifyTOTP', 'twoFactor.disable', 'twoFactor.generateBackupCodes', 'twoFactor.listTrustedDevices'],
  },
  {
    name: 'Sitemaps',
    category: 'Platform',
    description: 'Auto-generated XML sitemaps with dynamic route registration.',
    module: 'SitemapModule',
  },
  {
    name: 'Error Reporting & Tracing',
    category: 'Observability',
    description: 'Structured error capture with stack traces. OTLP distributed tracing (Honeycomb, Jaeger, etc.).',
    module: 'ErrorReportingModule + TracingModule',
  },
  {
    name: 'CRUD Router Factory',
    category: 'Platform',
    description: 'DRF-style ViewSet factory. One call generates a typed service + tRPC router with list/get/create/update/delete. Scoped to org, user, or global. Soft-delete aware. Works with any Drizzle or drizzle-universal table.',
    module: '@cruzjs/core → createCrud()',
    trpc: ['<resource>.list', '<resource>.get', '<resource>.create', '<resource>.update', '<resource>.delete'],
  },
  {
    name: 'Admin Dashboard',
    category: 'Pro',
    description: 'Generic resource registry, CRUD panels, user impersonation, and admin-only procedures.',
    module: 'AdminModule (@cruzjs/saas)',
    trpc: ['admin.list', 'admin.get', 'admin.create', 'admin.update', 'admin.delete', 'admin.getStats', 'admin.impersonate'],
  },
  {
    name: 'Billing',
    category: 'Pro',
    description: 'Stripe-powered subscription management with plans, invoices, and customer portal.',
    module: 'BillingModule (@cruzjs/saas)',
    trpc: ['billing.getSubscription', 'billing.createPortalSession', 'billing.getInvoices'],
  },
  {
    name: 'Rich Text',
    category: 'Pro',
    description: 'Entity-scoped rich text with HTML sanitization, @mention resolution, and full-text search.',
    module: 'RichTextModule (@cruzjs/saas)',
    trpc: ['richText.get', 'richText.save', 'richText.search'],
  },
];

const categoryClasses: Record<string, string> = {
  Core: 'text-primary',
  Auth: 'text-primary-light',
  Communication: 'text-info',
  Platform: 'text-accent',
  Infrastructure: 'text-primary-dark',
  Compliance: 'text-primary-lighter',
  Observability: 'text-primary',
  Pro: 'text-primary-light',
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto pt-20 pb-24 px-4">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center px-4 py-1 text-sm font-medium text-slate-400 bg-white/5 border border-white/10 rounded-full">
              Reference Application
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white">
              CruzJS Feature Demo
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl">
              All {features.length} modules registered in this app. Each feature is fully wired with DI,
              tRPC routers, event listeners, and runtime adapter bindings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.name}
                className="p-5 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between w-full">
                    <p className="font-semibold text-white text-sm">{f.name}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 border border-white/10 ${categoryClasses[f.category] ?? 'text-slate-400'}`}>
                      {f.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>

                  <code className="text-xs text-slate-500 font-mono truncate block">
                    {f.module}
                  </code>

                  {f.trpc && f.trpc.length > 0 && (
                    <div className="flex flex-col gap-1 w-full">
                      {f.trpc.slice(0, 4).map((ep) => (
                        <code
                          key={ep}
                          className="text-xs text-primary-lighter font-mono bg-white/[0.03] px-2 py-0.5 rounded-md block"
                        >
                          {ep}
                        </code>
                      ))}
                      {f.trpc.length > 4 && (
                        <p className="text-xs text-slate-600">+{f.trpc.length - 4} more</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
