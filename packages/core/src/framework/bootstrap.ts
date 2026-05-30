// Internal server-function registry.
// Bridges application.server.ts initialization with route middleware,
// without either file needing to directly import the other.
// This file intentionally has no .server.ts imports so that middleware.ts
// and api.handler.ts can import it without triggering react-router:dot-server.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: readonly any[]) => Promise<any>;

let _getOrBuildContainer: AnyAsyncFn | null = null;
let _buildContainerWithModules: AnyAsyncFn | null = null;

export function _registerServerFunctions(fns: {
  getOrBuildContainer: AnyAsyncFn;
  buildContainerWithModules: AnyAsyncFn;
}): void {
  _getOrBuildContainer = fns.getOrBuildContainer;
  _buildContainerWithModules = fns.buildContainerWithModules;
}

function assertRegistered(): void {
  if (!_getOrBuildContainer || !_buildContainerWithModules) {
    throw new Error(
      '[CruzJS] Server not initialized. Ensure createCruzApp() is called before handling requests.',
    );
  }
}

export function _getOrBuildContainerFn(): AnyAsyncFn {
  assertRegistered();
  return _getOrBuildContainer!;
}

export function _getBuildContainerFn(): AnyAsyncFn {
  assertRegistered();
  return _buildContainerWithModules!;
}
