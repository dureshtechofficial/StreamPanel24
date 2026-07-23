/**
 * One entry from Flussonic's real `GET sessions` response — covers every
 * stream on the server in one flat, cursor-paginated list (`name` says which
 * stream it belongs to). Timestamps come back as unix milliseconds.
 */
export interface FlussonicSessionEntry {
  id: string;
  name: string;
  type?: string;
  ip?: string;
  proto?: string;
  started_at?: number;
  updated_at?: number;
  country?: string;
  [key: string]: unknown;
}

/** Flussonic's `GET sessions` response — cursor-paginated via `next`/`prev`, same envelope as `GET streams`. */
export interface FlussonicSessionsListResponse {
  next: string | null;
  prev: string | null;
  estimated_count?: number;
  timing?: Record<string, unknown>;
  sessions: FlussonicSessionEntry[];
}
