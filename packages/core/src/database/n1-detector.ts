/**
 * N+1 Query Detector for Drizzle ORM (development mode).
 *
 * Implements Drizzle's `Logger` interface. It normalizes each query,
 * counts how many times the same normalized pattern is executed, and
 * emits a console warning with stack traces when the count hits a
 * configurable threshold.
 *
 * Usage (opt-in, dev-only):
 *
 * ```ts
 * import { N1Detector } from '@cruzjs/core/database/n1-detector';
 *
 * const logger = process.env.NODE_ENV !== 'production' ? new N1Detector() : undefined;
 * const db = drizzle(binding, { logger });
 * ```
 */

import type { Logger } from 'drizzle-orm';

type QueryPattern = {
  normalized: string;
  count: number;
  firstStack: string;
};

export class N1Detector implements Logger {
  private patterns = new Map<string, QueryPattern>();
  private threshold: number;

  constructor(threshold = 3) {
    this.threshold = threshold;
  }

  logQuery(query: string, params: unknown[]): void {
    const normalized = this.normalize(query);

    const existing = this.patterns.get(normalized);
    if (existing) {
      existing.count++;
      if (existing.count === this.threshold) {
        const stack =
          new Error().stack?.split('\n').slice(2, 5).join('\n') || '';
        console.warn(
          `\x1b[33m[N+1 Warning]\x1b[0m Query repeated ${existing.count} times:\n` +
            `  ${normalized.slice(0, 100)}\n` +
            `  First seen: ${existing.firstStack.split('\n')[0]}\n` +
            `  Current: ${stack.split('\n')[0]}`,
        );
      }
    } else {
      this.patterns.set(normalized, {
        normalized,
        count: 1,
        firstStack:
          new Error().stack?.split('\n').slice(2, 5).join('\n') || '',
      });
    }
  }

  private normalize(query: string): string {
    return query
      .replace(/'[^']*'/g, '?')
      .replace(/\b\d+\b/g, '?')
      .replace(/\?\s*,\s*\?/g, '?, ?')
      .trim();
  }

  reset(): void {
    this.patterns.clear();
  }

  getPatterns(): Map<string, QueryPattern> {
    return new Map(this.patterns);
  }
}
