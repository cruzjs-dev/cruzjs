import {
  createTRPCHooks,
  createTRPCClientFactory,
  createDefaultQueryClient,
  registerTRPC,
} from '@cruzjs/core/trpc/client';
import type { AppRouter } from './router';

export const trpc = createTRPCHooks<AppRouter>();

registerTRPC(trpc);

export const createTRPCClient = () => createTRPCClientFactory(trpc);
export const createQueryClient = createDefaultQueryClient;
