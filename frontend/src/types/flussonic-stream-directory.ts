export interface FlussonicStreamDirectoryEntry {
  id: string;
  name: string;
  title: string | null;
  server_id: string;
  server_name: string;
  customer_id: string | null;
  /** Name of the customer this stream is currently assigned to (null if unassigned). */
  customer_name: string | null;
  status: string;
  /** Flussonic-side `config_json.disabled` — distinct from `status` (our own soft-delete/active flag). */
  disabled: boolean;
  /** Flussonic's own real-time `stats.status` (e.g. running/waiting/error) from the last sync — null if never synced. */
  live_status: string | null;
  /** Whether this stream currently has an order whose date window covers right now — gates the customer/reseller portal's on/off controls. */
  has_active_order: boolean;
}
