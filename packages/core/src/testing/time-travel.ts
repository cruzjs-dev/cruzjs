/**
 * Time Travel
 *
 * Freeze `Date.now()` to a specific point in time for deterministic tests.
 * Call `travelBack()` (or use it in `afterEach`) to restore the real clock.
 *
 * @example
 * ```typescript
 * import { travel, travelBack } from '@cruzjs/core/testing';
 *
 * travel(new Date('2025-01-01T00:00:00Z'));
 * expect(Date.now()).toBe(new Date('2025-01-01T00:00:00Z').getTime());
 *
 * travelBack();
 * // Date.now() returns the real current time again
 * ```
 */

let originalDateNow: (() => number) | null = null;

/**
 * Freeze `Date.now()` to return the timestamp of the given date.
 * Multiple calls without `travelBack()` will update the frozen time
 * without losing the original `Date.now` reference.
 *
 * @param date - The date to freeze time to
 */
export function travel(date: Date): void {
  const targetTime = date.getTime();

  if (!originalDateNow) {
    originalDateNow = Date.now;
  }

  Date.now = () => targetTime;
}

/**
 * Restore `Date.now()` to its original implementation.
 * Safe to call even if `travel()` was never called (no-op).
 */
export function travelBack(): void {
  if (originalDateNow) {
    Date.now = originalDateNow;
    originalDateNow = null;
  }
}
