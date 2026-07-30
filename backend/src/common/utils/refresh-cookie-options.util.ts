import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

/**
 * Shared security options for every refresh-token cookie (admin / customer /
 * reseller), driven by config so a cross-site frontend↔API setup can use
 * `SameSite=None; Secure` while plain localhost stays on `lax`. Each caller adds
 * its own `path`, `maxAge`, and cookie name on top.
 *
 * `sameSite: 'none'` is what lets the browser send the cookie on a cross-site
 * request after a full page reload — without it, refresh-on-mount gets no cookie
 * and silently logs the user out.
 */
export function refreshCookieSecurityOptions(
  configService: ConfigService,
): Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite'> {
  return {
    httpOnly: true,
    secure: configService.get<boolean>('cookie.secure') ?? false,
    sameSite:
      configService.get<'lax' | 'none' | 'strict'>('cookie.sameSite') ?? 'lax',
  };
}
