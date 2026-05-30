import { useAuth, type AuthOrganization } from '@cruzjs/core/auth/auth-provider';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

export type Organization = AuthOrganization;

export type SessionData = {
  userId: string;
  currentOrgId: string | null;
  expiresAt: string;
};

export interface OrgTRPCHooks {
  auth: {
    session: {
      useQuery: () => { data: any; isLoading: boolean; refetch: () => any };
    };
  };
  userProfile: {
    setCurrentOrg: {
      useMutation: () => { mutateAsync: (input: { orgId: string }) => Promise<any>; isPending: boolean };
    };
  };
}

let _trpc: OrgTRPCHooks | null = null;

export function registerOrgTRPC(trpc: OrgTRPCHooks) {
  _trpc = trpc;
}

export function useCurrentOrg() {
  const { organizations, loading, currentOrg, refresh } = useAuth();

  return {
    currentOrg,
    organizations,
    loading,
    refresh,
  };
}

export function useSwitchOrg() {
  const trpc = _trpc;
  const queryClient = useQueryClient();
  const setCurrentOrgMutation = trpc?.userProfile.setCurrentOrg.useMutation() ?? {
    mutateAsync: async () => {},
    isPending: false,
  };
  const switchInProgressRef = useRef(false);

  const switchOrg = useCallback(async (orgId: string): Promise<boolean> => {
    if (switchInProgressRef.current || setCurrentOrgMutation.isPending) {
      return false;
    }

    switchInProgressRef.current = true;

    try {
      await setCurrentOrgMutation.mutateAsync({ orgId });
      await queryClient.invalidateQueries();
      switchInProgressRef.current = false;
      return true;
    } catch {
      switchInProgressRef.current = false;
      return false;
    }
  }, [setCurrentOrgMutation, queryClient]);

  return {
    switchOrg,
    switching: setCurrentOrgMutation.isPending || switchInProgressRef.current,
  };
}
