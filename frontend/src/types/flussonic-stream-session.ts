export interface IpWhoIsInfo {
  ip?: string;
  success?: boolean;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  connection?: {
    isp?: string;
    org?: string;
    domain?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface FlussonicStreamSession {
  id: string;
  flussonic_stream_id: string | null;
  session_uuid: string;
  stream_name: string;
  type: string | null;
  ip: string | null;
  /** UTC unix timestamp (seconds) */
  started_at: number | null;
  proto: string | null;
  /** UTC unix timestamp (seconds) — Flussonic's own session updated_at */
  updated_at: number | null;
  country: string | null;
  /** Computed by the backend, never stored — null when `ip` is null. */
  ip_lookup_url: string | null;
}
