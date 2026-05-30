// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://www.cruzjs.dev',
	integrations: [
		starlight({
			title: 'CruzJS',
			social: [],
			components: {
				Header: './src/components/Header.astro',
				Footer: './src/components/Footer.astro',
			},
			customCss: ['./src/styles/custom.css'],
			head: [
				{
					tag: 'script',
					content: `document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('starlight-theme', 'light');`,
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'prologue/introduction' },
						{ label: 'Quick Start', slug: 'prologue/quick-start' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Configuration', slug: 'getting-started/configuration' },
						{ label: 'Directory Structure', slug: 'getting-started/directory-structure' },
						{ label: 'First Application', slug: 'getting-started/first-application' },
						{ label: 'Deployment', slug: 'getting-started/deployment' },
						{ label: 'Built for AI', slug: 'getting-started/skills', badge: { text: 'AI', variant: 'note' } },
						{ label: 'Claude Integration', slug: 'getting-started/claude-integration', badge: { text: 'AI', variant: 'note' } },
						{ label: 'Upgrade Guide', slug: 'prologue/upgrade-guide' },
						{ label: 'Contributing', slug: 'prologue/contributing' },
					],
				},
				{
					label: 'Build a TaskBoard SaaS',
					badge: { text: 'Tutorial', variant: 'tip' },
					items: [
						{ label: 'Introduction', slug: 'tutorial/00-introduction' },
						{ label: '01 — Create Project', slug: 'tutorial/01-create-project' },
						{ label: '02 — Database Schema', slug: 'tutorial/02-database-schema' },
						{ label: '03 — First Feature', slug: 'tutorial/03-first-feature' },
						{ label: '04 — Authentication', slug: 'tutorial/04-authentication' },
						{ label: '05 — Organizations', slug: 'tutorial/05-organizations' },
						{ label: '06 — Permissions', slug: 'tutorial/06-permissions' },
						{ label: '07 — Real-Time', slug: 'tutorial/07-real-time' },
						{ label: '08 — Background Jobs', slug: 'tutorial/08-background-jobs' },
						{ label: '09 — File Uploads', slug: 'tutorial/09-file-uploads' },
						{ label: '10 — Billing', slug: 'tutorial/10-billing' },
						{ label: '11 — Deployment', slug: 'tutorial/11-deployment' },
						{ label: '12 — AI Features', slug: 'tutorial/11-ai', badge: { text: 'AI', variant: 'note' } },
					],
				},
				{
					label: 'Architecture',
					items: [
						{ label: 'Request Lifecycle', slug: 'architecture/request-lifecycle' },
						{ label: 'Dependency Injection', slug: 'architecture/dependency-injection' },
						{ label: 'Modules', slug: 'architecture/modules' },
						{ label: 'Service Providers', slug: 'architecture/service-providers' },
						{ label: 'Data Ownership', slug: 'architecture/data-ownership' },
					],
				},
				{
					label: 'Backend',
					items: [
						{ label: 'Routing', slug: 'basics/routing' },
						{ label: 'tRPC Routers', slug: 'basics/trpc-routers' },
						{ label: 'API Controllers', slug: 'basics/api-controllers' },
						{ label: 'CRUD Router Factory', slug: 'advanced/crud' },
						{ label: 'Services', slug: 'basics/services' },
						{ label: 'Validation', slug: 'basics/validation' },
						{ label: 'Middleware', slug: 'basics/middleware' },
						{ label: 'Error Handling', slug: 'basics/error-handling' },
					],
				},
				{
					label: 'Database',
					items: [
						{ label: 'Getting Started', slug: 'database/getting-started' },
						{ label: 'Schema Definition', slug: 'database/schema-definition' },
						{ label: 'Queries', slug: 'database/queries' },
						{ label: 'Transactions', slug: 'database/transactions' },
						{ label: 'Migrations', slug: 'database/migrations' },
						{ label: 'Seeding', slug: 'database/seeding' },
						{ label: 'Factories', slug: 'database/factories' },
						{ label: 'Encrypted Columns', slug: 'database/encrypted-columns' },
					],
				},
				{
					label: 'Auth & Security',
					items: [
						{ label: 'Authentication', slug: 'security/authentication' },
						{ label: 'Authorization', slug: 'security/authorization' },
						{ label: 'Social Auth (OAuth)', slug: 'security/oauth' },
						{ label: 'Sessions', slug: 'security/sessions' },
						{ label: 'Email Verification', slug: 'security/email-verification' },
						{ label: 'Password Reset', slug: 'security/password-reset' },
						{ label: 'Magic Links', slug: 'advanced/magic-links' },
						{ label: 'Two-Factor Auth', slug: 'advanced/two-factor' },
						{ label: 'CSRF Protection', slug: 'security/csrf' },
						{ label: 'Rate Limiting', slug: 'security/rate-limiting' },
						{ label: 'Resource Policies', slug: 'security/policies' },
					],
				},
				{
					label: 'Organizations & Teams',
					items: [
						{ label: 'Organizations', slug: 'security/organizations' },
						{ label: 'Members & Roles', slug: 'saas/members-roles' },
						{ label: 'Permissions', slug: 'saas/permissions' },
					],
				},
				{
					label: 'UI Components',
					badge: { text: '124+', variant: 'success' },
					items: [
						{ label: 'Overview', slug: 'frontend/overview' },
						{ label: 'Component Library', slug: 'frontend/components' },
						{ label: 'Storybook', slug: 'frontend/storybook' },
						{ label: 'tRPC Client', slug: 'frontend/trpc-client' },
						{ label: 'Layouts', slug: 'frontend/layouts' },
						{ label: 'Forms', slug: 'frontend/forms' },
						{ label: 'Loading & Error States', slug: 'frontend/loading-error-states' },
						{ label: 'Permissions in UI', slug: 'frontend/permissions-ui' },
					],
				},
				{
					label: 'Communication',
					items: [
						{ label: 'Email', slug: 'advanced/email' },
						{ label: 'Notifications', slug: 'advanced/notifications' },
						{ label: 'Broadcasting', slug: 'advanced/broadcasting' },
						{ label: 'Webhooks', slug: 'advanced/webhooks' },
						{ label: 'Events', slug: 'advanced/events' },
					],
				},
				{
					label: 'Background Processing',
					items: [
						{ label: 'Background Jobs', slug: 'advanced/jobs' },
						{ label: 'Queues', slug: 'advanced/queues' },
						{ label: 'Task Scheduler', slug: 'advanced/scheduler' },
					],
				},
				{
					label: 'Storage & Search',
					items: [
						{ label: 'File Storage', slug: 'advanced/file-storage' },
						{ label: 'File Uploads', slug: 'advanced/file-uploads' },
						{ label: 'Caching', slug: 'advanced/caching' },
						{ label: 'Full-Text Search', slug: 'advanced/search' },
						{ label: 'Multi-Database', slug: 'advanced/multi-database' },
					],
				},
				{
					label: 'Infrastructure',
					items: [
						{ label: 'Configuration Service', slug: 'advanced/configuration-service' },
						{ label: 'Feature Flags', slug: 'advanced/feature-flags' },
						{ label: 'Maintenance Mode', slug: 'advanced/maintenance-mode' },
						{ label: 'Flash Messages', slug: 'advanced/flash-messages' },
						{ label: 'Signed URLs', slug: 'advanced/signed-urls' },
						{ label: 'Idempotency Keys', slug: 'advanced/idempotency' },
						{ label: 'Export & Import', slug: 'advanced/export-import' },
					],
				},
				{
					label: 'Observability',
					items: [
						{ label: 'Logging', slug: 'basics/logging' },
						{ label: 'Health Checks', slug: 'advanced/health-checks' },
						{ label: 'Tracing', slug: 'advanced/observability' },
					],
				},
				{
					label: 'AI',
					badge: { text: 'AI', variant: 'note' },
					items: [
						{ label: 'AI Integration', slug: 'advanced/ai' },
					],
				},
				{
					label: 'SaaS',
					items: [
						{ label: 'Billing (Stripe)', slug: 'saas/billing' },
						{ label: 'Admin Dashboard', slug: 'saas/admin' },
						{ label: 'Audit Logging', slug: 'saas/audit-logging' },
						{ label: 'Rich Text', slug: 'saas/rich-text' },
					],
				},
				{
					label: 'Deployment',
					items: [
						{ label: 'Adapter Setup', slug: 'adapters/cloudflare' },
						{ label: 'Infrastructure (IaC)', slug: 'adapters/infrastructure' },
						{ label: 'Cloudflare Overview', slug: 'cloudflare/overview' },
						{ label: 'D1 Database', slug: 'cloudflare/d1' },
						{ label: 'KV Storage', slug: 'cloudflare/kv' },
						{ label: 'R2 Object Storage', slug: 'cloudflare/r2' },
						{ label: 'Workers', slug: 'cloudflare/workers' },
						{ label: 'Workflows', slug: 'cloudflare/workflows' },
						{ label: 'Queues', slug: 'cloudflare/queues' },
						{ label: 'Workers AI', slug: 'cloudflare/ai' },
						{ label: 'Multi-Cloud Roadmap', slug: 'adapters/overview', badge: { text: 'Planned', variant: 'caution' } },
					],
				},
				{
					label: 'CLI',
					items: [
						{ label: 'Overview', slug: 'cli/overview' },
						{ label: 'Development', slug: 'cli/development' },
						{ label: 'Database Commands', slug: 'cli/database' },
						{ label: 'Scaffolding', slug: 'cli/scaffolding' },
						{ label: 'Deploy & Infrastructure', slug: 'cli/deploy' },
						{ label: 'Resource Management', slug: 'cli/resources' },
					],
				},
				{
					label: 'Testing',
					items: [
						{ label: 'Getting Started', slug: 'testing/getting-started' },
						{ label: 'Unit Tests', slug: 'testing/unit-tests' },
						{ label: 'E2E Tests', slug: 'testing/e2e-tests' },
						{ label: 'Database Tests', slug: 'testing/database-tests' },
					],
				},
				{
					label: 'Recipes',
					items: [
						{ label: 'CRUD Feature', slug: 'recipes/crud-feature' },
						{ label: 'API Keys', slug: 'recipes/api-keys' },
						{ label: 'Multi-Tenant SaaS', slug: 'recipes/multi-tenant-saas' },
						{ label: 'Service Providers', slug: 'recipes/service-provider' },
						{ label: 'Adding a Package', slug: 'recipes/adding-package' },
					],
				},
				{
					label: 'API Reference',
					badge: { text: 'Auto-generated', variant: 'note' },
					autogenerate: { directory: 'api' },
				},
				{
					label: 'About',
					items: [
						{ label: 'About CruzJS', slug: 'about/about' },
					],
				},
				{
					label: 'Comparisons',
					items: [
						{ label: 'CruzJS vs NestJS', slug: 'about/vs-nestjs' },
						{ label: 'CruzJS vs Next.js', slug: 'about/vs-nextjs' },
						{ label: 'CruzJS vs Remix', slug: 'about/vs-remix' },
						{ label: 'CruzJS vs Hono', slug: 'about/vs-hono' },
						{ label: 'CruzJS vs Express', slug: 'about/vs-express' },
						{ label: 'CruzJS vs AdonisJS', slug: 'about/vs-adonisjs' },
						{ label: 'CruzJS vs Laravel', slug: 'about/vs-laravel' },
						{ label: 'CruzJS vs Django', slug: 'about/vs-django' },
						{ label: 'CruzJS vs Rails', slug: 'about/vs-rails' },
					],
				},
			],
		}),
	],
});
