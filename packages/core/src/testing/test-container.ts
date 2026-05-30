/**
 * Test Container Factory
 *
 * Creates a real DI container with optional module overrides for testing.
 * Uses `buildContainerWithModules` internally with test-friendly defaults.
 *
 * @example
 * ```typescript
 * import { createTestContainer } from '@cruzjs/core/testing';
 *
 * const container = await createTestContainer([MyModule], {
 *   overrides: (c) => {
 *     c.replace(ExternalService).toConstantValue(mockService);
 *   },
 * });
 *
 * const service = container.resolve(MyService);
 * ```
 */

import { CruzContainer, type ModuleClass } from '../di';

export interface TestContainerOptions {
  /**
   * Callback to apply overrides after modules are loaded.
   * Use `container.replace()` to swap real services for mocks.
   */
  overrides?: (container: CruzContainer) => void;

  /**
   * Whether to skip loading core framework modules (Auth, Email, Jobs, etc.).
   * When true, only the provided modules are loaded.
   * @default false
   */
  skipCoreModules?: boolean;
}

/**
 * Build a real DI container for integration/unit testing.
 *
 * Loads the provided modules into a fresh CruzContainer, then applies
 * any overrides. Unlike `buildContainerWithModules`, this does NOT
 * register tRPC routers, event listeners, or queue consumers — keeping
 * the container lightweight for tests.
 *
 * @param modules - Module classes to load into the container
 * @param options - Optional configuration (overrides, skipCoreModules)
 * @returns A fully-configured CruzContainer ready for testing
 */
export function createTestContainer(
  modules: ModuleClass[] = [],
  options: TestContainerOptions = {},
): CruzContainer {
  const container = new CruzContainer();

  // Load modules
  for (const mod of modules) {
    container.loadModule(mod);
  }

  // Apply overrides (replace services with mocks, bind test values, etc.)
  if (options.overrides) {
    options.overrides(container);
  }

  return container;
}
