/**
 * Backwards compatibility re-exports.
 * Canonical implementations are in @cruzjs/start/orgs/org.hooks.
 */
export {
  registerOrgTRPC,
  useCurrentOrg,
  useSwitchOrg,
} from '@cruzjs/start/orgs/org.hooks';

export type {
  OrgTRPCHooks,
  Organization,
  SessionData,
} from '@cruzjs/start/orgs/org.hooks';
