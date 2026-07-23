/**
 * `type: 'customer'` distinguishes these from admin/user tokens even though
 * both currently sign with the same JWT secrets — a customer token's `sub`
 * is a `customers.id`, never a `users.id`, and the two guards are bound to
 * different passport strategy names, but this marker makes that explicit
 * rather than relying solely on id-space non-collision.
 */
export interface CustomerAccessTokenPayload {
  sub: string;
  type: 'customer';
}

export interface CustomerRefreshTokenPayload {
  sub: string;
  type: 'customer';
}
