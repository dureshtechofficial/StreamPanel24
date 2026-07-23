export enum FlussonicStreamStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  /** Soft-delete marker. Rows are never physically removed — see FlussonicStreamsService.remove(). */
  DELETED = 'deleted',
}
