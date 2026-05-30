/**
 * App nav registry.
 *
 * Lets an app contribute primary navigation links to the shared Navbar without
 * the package hardcoding app-specific routes. Register once at startup (e.g. in
 * the app's trpc/client setup, imported by root on both server and client):
 *
 *   import { registerAppNavItems } from '@cruzjs/start/layout/nav-registry';
 *   registerAppNavItems([{ label: 'Chatbots', to: '/chatbots' }]);
 */

export interface AppNavItem {
  label: string;
  to: string;
}

let items: AppNavItem[] = [];

export function registerAppNavItems(next: AppNavItem[]): void {
  items = next;
}

export function getAppNavItems(): AppNavItem[] {
  return items;
}
