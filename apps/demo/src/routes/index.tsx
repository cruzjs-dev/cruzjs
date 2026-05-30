import { useNavigate } from 'react-router';
import { useAuth } from '@cruzjs/core/auth/auth-provider';

const features = [
  {
    icon: '⚡',
    title: 'Cloudflare-Native',
    desc: 'Deploy to Cloudflare Pages with D1, KV, R2, Workers AI, and Queues — all configured from a single TypeScript file.',
  },
  {
    icon: '🔧',
    title: 'Full-Stack TypeScript',
    desc: 'React Router v7, tRPC for type-safe APIs, Drizzle ORM for database access, and Inversify for dependency injection.',
  },
  {
    icon: '🏢',
    title: 'Multi-Tenant Ready',
    desc: 'Built-in org management, role-based permissions, invitation flows, and audit logging via @cruzjs/saas.',
  },
  {
    icon: '🎨',
    title: 'Component Library',
    desc: 'Tailwind CSS with pre-built layouts, forms, data tables, modals, and theming via @cruzjs/start.',
  },
  {
    icon: '📦',
    title: 'One CLI',
    desc: 'cruz dev, cruz deploy production, cruz db migrate — everything from development to production in one tool.',
  },
  {
    icon: '🧩',
    title: 'Module System',
    desc: 'Modular feature architecture. Each domain registers its DI container, tRPC router, routes, and event listeners via @Module.',
  },
];

const codeExample = `// cruz.config.ts
import { defineConfig } from '@cruzjs/cli/config';

export default defineConfig({
  name: 'my-app',
  bindings: { d1: true, kv: true, r2: true, ai: true },
  environments: {
    production: {
      vars: { APP_URL: 'https://my-app.pages.dev' },
    },
  },
});`;

const cliExample = `$ cruz init production    # Create D1, KV, R2 resources
$ cruz deploy production  # Build + migrate + ship
$ cruz deploy preview     # Preview from current branch
$ cruz db query "SELECT * FROM users"`;

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-surface/85 backdrop-blur-xl border-b border-surface-border">
        <span className="text-xl font-bold font-mono text-text">
          cruz<span className="text-primary">js</span>
        </span>
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/auth/login')}
                className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/auth/register')}
                className="px-4 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto pt-32 md:pt-44 pb-16 md:pb-24 text-center px-4">
        <div className="flex flex-col items-center gap-6">
          <span className="inline-flex items-center px-4 py-1 text-sm font-medium text-primary bg-primary-subtle border border-primary-light rounded-full">
            Open-source full-stack framework
          </span>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-text leading-tight tracking-tight">
            Ship to{' '}
            <span className="bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent">
              Cloudflare
            </span>
            <br />
            in minutes
          </h1>

          <p className="text-lg md:text-xl text-text-muted max-w-2xl">
            CruzJS is a full-stack TypeScript framework that gives you D1, KV, R2, Workers AI,
            tRPC, auth, orgs, and deployment — all wired together and ready to go.
          </p>

          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth/register')}
              className="px-6 py-3 text-base font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark shadow-lg transition-colors"
            >
              {user ? 'Go to Dashboard' : 'Start Building'}
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-3 text-base font-semibold text-text border border-surface-border rounded-lg hover:bg-surface-light transition-colors"
            >
              Learn More
            </button>
          </div>

          <div className="pt-2">
            <code className="inline-block px-4 py-2 text-sm font-mono text-primary bg-surface-lighter border border-surface-border rounded-lg">
              npm create @cruzjs my-app
            </code>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="py-16 md:py-24 bg-surface-light">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-text-muted max-w-xl mx-auto">
              From database to deployment, CruzJS handles the full stack so you can focus on your product.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 bg-surface border border-surface-border rounded-xl shadow-sm hover:border-primary-light hover:shadow-md transition-all"
              >
                <p className="text-2xl mb-3">{f.icon}</p>
                <p className="font-semibold text-text mb-2">{f.title}</p>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider">
                Configuration
              </p>
              <h3 className="text-2xl font-bold text-text">
                One config file
              </h3>
              <p className="text-text-muted leading-relaxed">
                Define your bindings, environments, and vars in a single TypeScript config.
                CruzJS generates wrangler.toml, provisions resources, and deploys — all from this file.
              </p>
              <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-auto">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre">
                  {codeExample}
                </pre>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider">
                CLI
              </p>
              <h3 className="text-2xl font-bold text-text">
                One command to deploy
              </h3>
              <p className="text-text-muted leading-relaxed">
                Initialize infrastructure, deploy to production, preview from branches, and query your
                database — all from the same CLI.
              </p>
              <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-auto">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre">
                  {cliExample}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stack */}
      <div className="py-16 md:py-24 bg-surface-light">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-8">
            Built on the best
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'React Router v7', 'Cloudflare Pages', 'D1 (SQLite)', 'KV', 'R2',
              'Workers AI', 'tRPC', 'Drizzle ORM', 'Inversify',
              'Tailwind CSS', 'Vitest', 'Playwright',
            ].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 text-sm font-medium text-text bg-surface border border-surface-border rounded-lg shadow-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center px-4">
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-3xl md:text-4xl font-bold text-text">
              Ready to build?
            </h2>
            <p className="text-lg text-text-muted max-w-md">
              Get from zero to deployed in under five minutes. No boilerplate, no guesswork.
            </p>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth/register')}
              className="px-8 py-3 text-base font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark shadow-lg transition-colors"
            >
              {user ? 'Go to Dashboard' : 'Get Started Free'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-surface-border py-8">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center flex-wrap gap-4">
          <p className="text-sm text-text-muted">
            CruzJS — Full-stack TypeScript for Cloudflare
          </p>
          <p className="text-xs text-text-muted">
            Built with Cruz
          </p>
        </div>
      </div>
    </div>
  );
}
