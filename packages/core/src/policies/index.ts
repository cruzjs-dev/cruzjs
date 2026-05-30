export {
  definePolicy,
  enforce,
  can,
  cannot,
  buildPolicyContext,
} from './policy';
export type {
  PolicyContext,
  PolicyAbility,
  PolicyFn,
  ResourcePolicy,
} from './policy';

export { withPolicy } from './policy.middleware';
export type { ResourceLoader } from './policy.middleware';
