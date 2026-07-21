export enum ResellerStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
  /** Soft-delete marker. Rows are never physically removed — see ResellersService.remove(). */
  DELETED = 'deleted',
}
