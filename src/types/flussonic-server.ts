export type ApiVersionTag = 'v3' | 'v4' | 'v5' | 'custom';
export type FlussonicServerStatus = 'active' | 'inactive' | 'maintenance' | 'unreachable';

export interface FlussonicServer {
  id: string;
  name: string;
  hostname: string;
  domain: string | null;
  port: number;
  use_ssl: boolean;
  api_username: string;
  api_base_path: string;
  flussonic_version: string | null;
  api_version_tag: ApiVersionTag;
  status: FlussonicServerStatus;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}

export interface FlussonicServerInput {
  name: string;
  hostname: string;
  domain?: string;
  port?: number;
  use_ssl?: boolean;
  api_username: string;
  /** Write-only: only sent when set/changed, never returned by the API */
  api_password?: string;
  api_base_path?: string;
  /** Write-only: only sent when set/changed, never returned by the API */
  api_access_token?: string;
  flussonic_version?: string;
  api_version_tag?: ApiVersionTag;
  status?: FlussonicServerStatus;
}
