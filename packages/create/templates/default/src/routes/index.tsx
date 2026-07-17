import { useNavigate } from 'react-router';
import { useAuth } from '@cruzjs/core/auth/auth-provider';
import { Button } from '@cruzjs/ui';

const features = [
  {
    icon: '⚡',
    title: 'Cloudflare-Native',
    desc: 'Deploy to Cloudflare Pages with D1, KV, R2, Workers AI, and Queues — configured from a single TypeScript file.',
  },
  {
    icon: '🔧',
    title: 'Full-Stack TypeScript',
    desc: 'React Router v7, tRPC for type-safe APIs, Drizzle ORM for database access, and Inversify for dependency injection.',
  },
  {
    icon: '🔐',
    title: 'Auth Built-In',
    desc: 'Session management, email verification, OAuth providers, password reset — all wired up and ready to use.',
  },
  {
    icon: '🏢',
    title: 'Multi-Tenant Ready',
    desc: 'Built-in org management, role-based permissions, and invitation flows via @cruzjs/start.',
  },
  {
    icon: '🎨',
    title: 'Great UI',
    desc: 'Tailwind CSS with the @cruzjs/ui component library — pre-built layouts, forms, data tables, modals, and theming.',
  },
  {
    icon: '🧩',
    title: 'Feature Modules',
    desc: 'Modular architecture — each feature registers its own DI container, tRPC router, and routes.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#030712]/80 px-6 py-3 backdrop-blur-md">
        <span className="font-mono text-xl font-bold">
          my<span className="text-[#818cf8]">app</span>
        </span>
        <div className="flex items-center gap-3">
          {user ? (
            <Button size="sm" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => navigate('/auth/login')}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate('/auth/register')}>
                Get Started
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-32 text-center md:pb-24 md:pt-44">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm text-gray-400">
            Built with CruzJS on Cloudflare
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
            Ship to{' '}
            <span className="bg-gradient-to-r from-[#818cf8] via-[#6366f1] to-[#a78bfa] bg-clip-text text-transparent">
              Cloudflare
            </span>
            <br />
            in minutes
          </h1>

          <p className="max-w-2xl text-lg text-gray-400 md:text-xl">
            A full-stack TypeScript framework with auth, orgs, tRPC, Drizzle ORM, and
            one-command deployment — all running on Cloudflare's edge network.
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate(user ? '/dashboard' : '/auth/register')}>
              {user ? 'Go to Dashboard' : 'Start Building'}
            </Button>
            {!user && (
              <Button size="lg" variant="outline" onClick={() => navigate('/auth/login')}>
                Sign In
              </Button>
            )}
          </div>

          <div className="pt-2">
            <code className="rounded-lg bg-white/10 px-4 py-2 font-mono text-sm text-[#818cf8]">
              npx create-cruz-app my-app
            </code>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 flex flex-col items-center gap-4 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Everything you need</h2>
            <p className="max-w-xl text-lg text-gray-400">
              From database to deployment, CruzJS handles the full stack so you can focus on your product.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-white/20 hover:bg-white/10"
              >
                <div className="mb-3 text-2xl">{f.icon}</div>
                <div className="mb-2 font-semibold">{f.title}</div>
                <p className="text-sm leading-relaxed text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-3xl font-bold md:text-4xl">Ready to build?</h2>
            <p className="max-w-md text-lg text-gray-400">
              Get from zero to deployed in under five minutes. No boilerplate, no guesswork.
            </p>
            <Button size="lg" onClick={() => navigate(user ? '/dashboard' : '/auth/register')}>
              {user ? 'Go to Dashboard' : 'Get Started Free'}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6">
          <span className="text-sm text-gray-500">Built with CruzJS</span>
          <span className="text-xs text-gray-600">Powered by Cloudflare</span>
        </div>
      </footer>
    </div>
  );
}
