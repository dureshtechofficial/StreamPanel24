export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  /** Soft-delete marker. Rows are never physically removed — see PlansService.remove(). */
  DELETED = 'deleted',
}
