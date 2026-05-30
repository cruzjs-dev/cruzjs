import { useEffect, type ReactNode } from 'react';
import {
  OrgProvider,
  registerOrgIdGetter,
  useOrgContext,
} from '../contexts/OrgContext';

/**
 * Bridge that connects OrgContext to the tRPC client headers.
 * Registers the org ID getter so tRPC requests include X-Organization-ID.
 */
const OrgContextBridge: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { orgIdRef } = useOrgContext();

  useEffect(() => {
    registerOrgIdGetter(() => orgIdRef.current);
  }, [orgIdRef]);

  return <>{children}</>;
};

type CruzSaasProvidersProps = {
  children: ReactNode;
};

/**
 * CruzJS Pro provider that wraps org context + tRPC org integration.
 *
 * Must be rendered as a parent of `CruzProviders` so the org ID getter
 * is available when tRPC headers are built.
 *
 * @example
 * ```tsx
 * import { CruzSaasProviders } from '@cruzjs/saas/providers/CruzSaasProviders';
 * import { CruzProviders } from '@cruzjs/core/framework/components';
 *
 * export default function App() {
 *   return (
 *     <CruzSaasProviders>
 *       <CruzProviders trpc={trpc} createClient={...} createQueryClient={...}>
 *         <Outlet />
 *       </CruzProviders>
 *     </CruzSaasProviders>
 *   );
 * }
 * ```
 */
export const CruzSaasProviders: React.FC<CruzSaasProvidersProps> = ({ children }) => {
  return (
    <OrgProvider>
      <OrgContextBridge>
        {children}
      </OrgContextBridge>
    </OrgProvider>
  );
};
