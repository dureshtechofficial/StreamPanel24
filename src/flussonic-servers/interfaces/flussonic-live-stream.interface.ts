/**
 * One entry from Flussonic's real `GET streams` response. Its shape is far
 * deeper/more variable than our own `FlussonicStreamConfig` (live `stats`,
 * per-input `stats`, `media_info` track lists, etc.), so beyond `name` (used
 * to match against our local cache) and `config_on_disk` (used to seed a
 * newly-discovered stream's `config_json`), we store it verbatim rather than
 * modeling every field.
 */
export interface FlussonicLiveStream {
  name: string;
  position?: number;
  title?: string;
  static?: boolean;
  config_on_disk?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Flussonic's `GET streams` response — cursor-paginated via `next`/`prev`. */
export interface FlussonicStreamsListResponse {
  next: string | null;
  prev: string | null;
  server_id?: string;
  streams: FlussonicLiveStream[];
  estimated_count?: number;
  timing?: Record<string, unknown>;
}
