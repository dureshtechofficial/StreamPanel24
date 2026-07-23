export interface FlussonicServerStat {
  id: string;
  server_id: string;
  cpu_usage: string | null;
  /** Percentage (0-100), from a real sync. Legacy manual entries use ram_usage_mb instead. */
  memory_usage_percent: string | null;
  ram_usage_mb: number | null;
  disk_usage_gb: number | null;
  network_in_mbps: string | null;
  network_out_mbps: string | null;
  /** Currently-online streams. */
  active_streams: number | null;
  /** Total configured streams, online or not. */
  total_streams: number | null;
  active_viewers: number | null;
  active_publishers: number | null;
  /** Combined viewers + publishers + API clients, from a real sync. */
  total_clients: number | null;
  scheduler_load: number | null;
  streamer_status: string | null;
  server_version: string | null;
  uptime_seconds: number | null;
  /** UTC unix timestamp (seconds) */
  created_at: number;
}

export interface FlussonicServerStatInput {
  cpu_usage?: number;
  ram_usage_mb?: number;
  disk_usage_gb?: number;
  network_in_mbps?: number;
  network_out_mbps?: number;
  active_streams?: number;
  active_viewers?: number;
  active_publishers?: number;
  uptime_seconds?: number;
}
