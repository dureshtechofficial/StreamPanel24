/** Only admin and reseller manage customers — a customer never manages other customers. */
export enum CustomerActionActor {
  ADMIN = 'admin',
  RESELLER = 'reseller',
}
