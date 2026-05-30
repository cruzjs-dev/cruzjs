import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router';
import { getTRPC } from '@cruzjs/core/trpc/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: string | null;
  isCurrent: boolean;
};

export type AuthSession = {
  userId: string;
  currentOrgId: string | null;
  expiresAt: string;
};

export type AuthState = {
  user: AuthUser | null;
  session: AuthSession | null;
  organizations: AuthOrganization[];
  loading: boolean;
  isAuthenticated: boolean;
  currentOrg: AuthOrganization | null;
  refresh: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  requireAuth?: boolean;
};

const PUBLIC_PATH_PREFIXES = ['/auth/', '/api/'];

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  requireAuth = true,
}) => {
  const trpc = getTRPC() as any;
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, refetch } = trpc.auth.session.useQuery();
  const [redirected, setRedirected] = useState(false);

  const isPublicRoute = PUBLIC_PATH_PREFIXES.some(p => location.pathname.startsWith(p))
    || location.pathname === '/';

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const organizations = useMemo<AuthOrganization[]>(
    () => (data?.organizations ?? []).filter((org: AuthOrganization) => org.role !== null),
    [data?.organizations],
  );

  const currentOrg = useMemo<AuthOrganization | null>(
    () => organizations.find((org: AuthOrganization) => org.isCurrent) ?? organizations[0] ?? null,
    [organizations],
  );

  const value = useMemo<AuthState>(
    () => ({
      user: data?.user ?? null,
      session: data?.session ?? null,
      organizations,
      loading: isLoading,
      isAuthenticated: !!data?.user,
      currentOrg,
      refresh,
    }),
    [data, isLoading, organizations, currentOrg, refresh],
  );

  useEffect(() => {
    if (requireAuth && !isPublicRoute && !isLoading && !data?.user && !redirected) {
      setRedirected(true);
      navigate('/auth/login');
    }
  }, [requireAuth, isPublicRoute, isLoading, data?.user, redirected, navigate]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

export function useAuthUser(): AuthUser {
  const { user, loading } = useAuth();
  if (!user && !loading) {
    throw new Error('useAuthUser called when no user is authenticated');
  }
  return user!;
}

export function useCurrentOrg(): AuthOrganization | null {
  return useAuth().currentOrg;
}
