export enum FlussonicServerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  UNREACHABLE = 'unreachable',
  /** Soft-delete marker. Rows are never physically removed — see FlussonicServersService.remove(). */
  DELETED = 'deleted',
}
