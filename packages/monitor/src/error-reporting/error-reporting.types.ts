/**
 * Error Reporting Types
 *
 * Core types for the error reporting system.
 * Defines severity levels, breadcrumbs, error context, and captured error shapes.
 */

export const ErrorSeverity = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;
export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

export interface Breadcrumb {
  category: string;
  message: string;
  level: ErrorSeverity;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface ErrorContext {
  user?: { id: string; email?: string; username?: string };
  org?: { id: string; slug?: string };
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
}

export interface CapturedError {
  id: string;
  error: Error;
  severity: ErrorSeverity;
  context: ErrorContext;
  fingerprint?: string[];
  release?: string;
  environment?: string;
  timestamp: Date;
}

export const ERROR_REPORTER_ADAPTER = Symbol.for('ERROR_REPORTER_ADAPTER');
