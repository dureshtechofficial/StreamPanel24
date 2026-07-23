/**
 * `type: 'reseller'` distinguishes these from admin/user and customer tokens
 * even though all three currently sign with the same JWT secrets — a
 * reseller token's `sub` is a `resellers.id`, never a `users.id` or
 * `customers.id`, and each principal type is bound to its own passport
 * strategy names, but this marker makes that explicit rather than relying
 * solely on id-space non-collision.
 */
export interface ResellerAccessTokenPayload {
  sub: string;
  type: 'reseller';
}

export interface ResellerRefreshTokenPayload {
  sub: string;
  type: 'reseller';
}
