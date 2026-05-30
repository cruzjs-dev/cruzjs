/**
 * Module Registry
 *
 * Stores the application's module list so that request handlers
 * (tRPC, REST API routes) can access it without explicit passing.
 *
 * `createCruzApp` populates this registry at startup. All subsequent
 * calls to `handleTRPCRequest` and `handleApiRequest` use the registered
 * modules automatically.
 */

import type { ModuleClass } from '../di';

let _registeredModules: ModuleClass[] = [];

/**
 * Register the application modules. Called once by `createCruzApp`.
 */
export function registerModules(modules: ModuleClass[]): void {
  _registeredModules = modules;
  _onRegisterCallback?.();
}

let _onRegisterCallback: (() => void) | null = null;
export function _setOnRegisterCallback(cb: () => void): void {
  _onRegisterCallback = cb;
}

/**
 * Retrieve the registered application modules.
 */
export function getRegisteredModules(): ModuleClass[] {
  return _registeredModules;
}
