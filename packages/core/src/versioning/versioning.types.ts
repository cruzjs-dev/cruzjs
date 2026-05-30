/**
 * API Versioning Types
 *
 * Core types for the API versioning system.
 */

export type ApiVersion = `v${number}`;

export const VersionStrategy = {
  URL_PATH: 'url_path',
  HEADER: 'header',
  QUERY_PARAM: 'query_param',
} as const;
export type VersionStrategy = (typeof VersionStrategy)[keyof typeof VersionStrategy];

export type VersionConfig = {
  current: ApiVersion;
  supported: ApiVersion[];
  deprecated?: ApiVersion[];
  strategy: VersionStrategy;
  headerName?: string;
  queryParam?: string;
  defaultVersion?: ApiVersion;
};

export type VersionInfo = {
  version: ApiVersion;
  deprecated: boolean;
  sunsetDate?: Date;
  changelog?: string;
};

export const DEFAULT_VERSION_CONFIG: VersionConfig = {
  current: 'v1',
  supported: ['v1'],
  strategy: VersionStrategy.HEADER,
  headerName: 'Accept-Version',
  queryParam: 'version',
  defaultVersion: 'v1',
} satisfies VersionConfig;
