/**
 * API Response Builder
 *
 * Provides static methods for building standardized JSON API responses.
 */

/**
 * Standard error response shape.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  path?: string;
}

/**
 * Standard success response envelope (optional - controllers can return plain objects too).
 */
export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Builder for standard API responses.
 */
export class ApiResponse {
  // ── Success responses ──────────────────────────────────────────────────

  static ok<T>(data: T, headers?: Record<string, string>): Response {
    return ApiResponse.json(data, 200, headers);
  }

  static created<T>(data: T, location?: string): Response {
    const headers: Record<string, string> = {};
    if (location) {
      headers['Location'] = location;
    }
    return ApiResponse.json(data, 201, headers);
  }

  static accepted<T>(data?: T): Response {
    if (data === undefined || data === null) {
      return new Response(null, { status: 202 });
    }
    return ApiResponse.json(data, 202);
  }

  static noContent(): Response {
    return new Response(null, { status: 204 });
  }

  // ── Error responses ────────────────────────────────────────────────────

  static badRequest(message: string, errors?: unknown): Response {
    return ApiResponse.errorResponse('BAD_REQUEST', message, 400, errors);
  }

  static unauthorized(message = 'Unauthorized'): Response {
    return ApiResponse.errorResponse('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Forbidden'): Response {
    return ApiResponse.errorResponse('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Not Found'): Response {
    return ApiResponse.errorResponse('NOT_FOUND', message, 404);
  }

  static conflict(message = 'Conflict'): Response {
    return ApiResponse.errorResponse('CONFLICT', message, 409);
  }

  static unprocessableEntity(message: string, errors?: unknown): Response {
    return ApiResponse.errorResponse('UNPROCESSABLE_ENTITY', message, 422, errors);
  }

  static tooManyRequests(retryAfter?: number): Response {
    const headers: Record<string, string> = {};
    if (retryAfter !== undefined) {
      headers['Retry-After'] = String(retryAfter);
    }
    return ApiResponse.errorResponse('TOO_MANY_REQUESTS', 'Too Many Requests', 429, undefined, headers);
  }

  static internalError(message = 'Internal Server Error', detail?: unknown): Response {
    return ApiResponse.errorResponse('INTERNAL_SERVER_ERROR', message, 500, detail);
  }

  // ── Generic ────────────────────────────────────────────────────────────

  static json<T>(data: T, status = 200, headers?: Record<string, string>): Response {
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    return new Response(JSON.stringify(data), {
      status,
      headers: responseHeaders,
    });
  }

  // ── Redirect ───────────────────────────────────────────────────────────

  static redirect(url: string, permanent = false): Response {
    return new Response(null, {
      status: permanent ? 301 : 302,
      headers: { Location: url },
    });
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  private static errorResponse(
    code: string,
    message: string,
    status: number,
    details?: unknown,
    extraHeaders?: Record<string, string>,
  ): Response {
    const body: ApiErrorResponse = {
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
      timestamp: new Date().toISOString(),
    };
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    });
  }
}
