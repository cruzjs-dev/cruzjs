import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type OrgContextValue = {
  orgId: string | null;
  setOrgId: (orgId: string | null) => void;
  /** Ref for tRPC client to read current org ID without re-renders */
  orgIdRef: React.MutableRefObject<string | null>;
};

const OrgContext = createContext<OrgContextValue | null>(null);

type OrgProviderProps = {
  children: ReactNode;
};

export const OrgProvider: React.FC<OrgProviderProps> = ({ children }) => {
  const [orgId, setOrgIdState] = useState<string | null>(null);
  const orgIdRef = useRef<string | null>(null);

  const setOrgId = useCallback((id: string | null) => {
    orgIdRef.current = id;
    setOrgIdState(id);
  }, []);

  return (
    <OrgContext.Provider value={{ orgId, setOrgId, orgIdRef }}>
      {children}
    </OrgContext.Provider>
  );
};

export function useOrgContext(): OrgContextValue {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrgContext must be used within an OrgProvider');
  }
  return context;
}

/**
 * Getter function for tRPC client to access current org ID
 * This is used by the httpBatchLink headers function
 */
let orgIdGetter: (() => string | null) | null = null;

export function registerOrgIdGetter(getter: () => string | null): void {
  orgIdGetter = getter;
}

export function getCurrentOrgId(): string | null {
  return orgIdGetter?.() ?? null;
}
