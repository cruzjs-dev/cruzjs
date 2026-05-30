import { getCurrentOrgId } from '@cruzjs/saas/contexts/OrgContext';
import { createTRPCHooks, createTRPCClientFactory, createDefaultQueryClient, registerTRPC } from '@cruzjs/core/trpc/client';
import { registerOrgTRPC } from '@cruzjs/start/orgs/org.hooks';
import { registerAppNavItems } from '@cruzjs/start/layout';
import type { AppRouter } from './router';

export const trpc = createTRPCHooks<AppRouter>();

// Register globally so package components can use getTRPC()
registerTRPC(trpc);
registerOrgTRPC(trpc as any);

// App primary nav — surfaced in the shared Navbar (logged-in users).
registerAppNavItems([
  { label: 'Chatbots', to: '/chatbots' },
  { label: 'PDFs', to: '/pdfs' },
]);

export const createTRPCClient = () => {
  return createTRPCClientFactory(trpc, {
    extraHeaders: (): Record<string, string> => {
      const orgId = getCurrentOrgId();
      return orgId ? { 'X-Organization-ID': orgId } : {};
    },
  });
};

export const createQueryClient = createDefaultQueryClient;
