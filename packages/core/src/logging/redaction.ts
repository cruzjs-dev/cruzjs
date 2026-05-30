const DEFAULT_REDACT_PATHS = [
  // Top-level exact matches
  'password', 'token', 'secret', 'accessToken', 'refreshToken',
  'authorization', 'cookie', 'ssn', 'creditCard',
  // Deep wildcard — catches nested paths like user.password, body.token, etc.
  '*.password', '*.token', '*.secret', '*.accessToken', '*.refreshToken',
  '*.authorization', '*.cookie', '*.ssn', '*.creditCard',
  // Explicit context.* for the common CruzJS context field
  'context.password', 'context.token', 'context.secret',
  'context.accessToken', 'context.refreshToken',
  'context.authorization', 'context.cookie',
];

export function buildRedactPaths(envValue: string | undefined, extraPaths: string[] = []): string[] {
  const envPaths = envValue
    ? envValue.split(',').map(p => p.trim()).filter(Boolean)
    : [];
  return [...new Set([...DEFAULT_REDACT_PATHS, ...envPaths, ...extraPaths])];
}
