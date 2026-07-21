export type FlussonicStreamStatus = 'active' | 'inactive';

export interface StreamInputEntry {
  url: string;
  priority?: number;
  comment?: string;
  source_timeout?: number;
}

export interface StreamProtocols {
  whitelist?: boolean;
  hls?: boolean;
  player?: boolean;
  rtmp?: boolean;
  srt?: boolean;
  cmaf?: boolean;
  dash?: boolean;
  mss?: boolean;
  rtsp?: boolean;
  m4f?: boolean;
  m4s?: boolean;
  mseld?: boolean;
  tshttp?: boolean;
  webrtc?: boolean;
  shoutcast?: boolean;
  mp4?: boolean;
  jpeg?: boolean;
  api?: boolean;
}

export interface StreamAuthHook {
  url: string;
  max_sessions?: number;
  domains?: string[];
  allowed_countries?: string[];
  disallowed_countries?: string[];
  soft_limitation?: boolean;
  session_keys?: string[];
  extra?: Record<string, unknown>;
}

export interface FlussonicStreamConfig {
  name: string;
  comment?: string;
  title?: string;
  static?: boolean;
  disabled?: boolean;
  inputs: StreamInputEntry[];
  retry_limit?: number;
  protocols?: StreamProtocols;
  on_play?: StreamAuthHook;
  on_publish?: StreamAuthHook;
}

export interface FlussonicStream {
  id: string;
  flussonic_server_id: string;
  ingest_domain: string | null;
  config_json: FlussonicStreamConfig;
  status: FlussonicStreamStatus;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
  /** UTC unix timestamp (seconds), only set once soft-deleted */
  deleted_at: number | null;
}

export interface FlussonicStreamInput extends FlussonicStreamConfig {
  ingest_domain?: string;
  status?: FlussonicStreamStatus;
  /** Skips the "already exists on the live Flussonic server" check — set after the user confirms an overwrite prompt. */
  confirmOverwrite?: boolean;
}

export interface StreamNameCheckResult {
  existsInDb: boolean;
  existsOnServer: boolean;
}
