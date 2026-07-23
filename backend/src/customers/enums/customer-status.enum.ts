export enum CustomerStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
  /** Soft-delete marker. Rows are never physically removed — see CustomersService.remove(). */
  DELETED = 'deleted',
}
