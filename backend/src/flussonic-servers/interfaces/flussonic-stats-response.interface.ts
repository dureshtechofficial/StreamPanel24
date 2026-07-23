/**
 * Partial shape of a Flussonic server's `GET {api_base_path}/{api_version_tag}/config/stats`
 * response — only the fields we currently map to columns are typed; everything
 * else still comes through (and is preserved verbatim in `raw_response`) since
 * this project only reads a subset of what Flussonic actually returns.
 */
export interface FlussonicStatsResponse {
  cpu_usage?: number;
  memory_usage?: number;
  online_streams?: number;
  total_streams?: number;
  total_clients?: number;
  uptime?: number;
  input_kbit?: number;
  output_kbit?: number;
  scheduler_load?: number;
  streamer_status?: string;
  server_version?: string;
  hostname?: string;
  partitions?: Array<{
    path: string;
    device: string;
    usage: number;
    io_util: number;
    total_mb: number;
  }>;
  [key: string]: unknown;
}
