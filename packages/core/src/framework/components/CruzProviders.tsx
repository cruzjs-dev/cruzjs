import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

type TRPCHooksLike = { Provider: React.ComponentType<{ client: unknown; queryClient: QueryClient; children: ReactNode }> };

type CruzProvidersProps = {
  trpc: TRPCHooksLike;
  createClient: () => unknown;
  createQueryClient: () => QueryClient;
  theme?: unknown;
  children: ReactNode;
};

export const CruzProviders: React.FC<CruzProvidersProps> = ({
  trpc,
  createClient,
  createQueryClient,
  children,
}) => {
  const [queryClient] = useState(() => createQueryClient());
  const [trpcClient] = useState(() => createClient());

  const TrpcProvider = trpc.Provider;

  return (
    <TrpcProvider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </TrpcProvider>
  );
};
