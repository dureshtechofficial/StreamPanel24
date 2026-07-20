/**
 * Flussonic's own `username:password` bearer-token scheme — the same encoding
 * as HTTP Basic auth (base64("<username>:<password>")), just sent via the
 * `Authorization: Bearer <token>` header instead of `Basic`.
 */
export function computeFlussonicAccessToken(
  username: string,
  password: string,
): string {
  return Buffer.from(`${username}:${password}`, 'ascii').toString('base64');
}
