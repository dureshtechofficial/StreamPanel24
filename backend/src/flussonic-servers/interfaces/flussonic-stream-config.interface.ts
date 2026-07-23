export interface FlussonicStreamInputConfig {
  url: string;
  priority?: number;
  comment?: string;
  source_timeout?: number;
}

export interface FlussonicStreamProtocolsConfig {
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

export interface FlussonicStreamAuthHookConfig {
  url: string;
  max_sessions?: number;
  domains?: string[];
  allowed_countries?: string[];
  disallowed_countries?: string[];
  soft_limitation?: boolean;
  session_keys?: string[];
  extra?: Record<string, unknown>;
}

/** The exact payload shape Flussonic's `PUT /streams/urlencode(name)` expects — stored verbatim in `flussonic_streams.config_json`. */
export interface FlussonicStreamConfig {
  name: string;
  comment?: string;
  title?: string;
  static?: boolean;
  disabled?: boolean;
  inputs: FlussonicStreamInputConfig[];
  retry_limit?: number;
  protocols?: FlussonicStreamProtocolsConfig;
  on_play?: FlussonicStreamAuthHookConfig;
  on_publish?: FlussonicStreamAuthHookConfig;
}
