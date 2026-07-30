import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import ms from 'ms';
import { refreshCookieSecurityOptions } from '../../common/utils/refresh-cookie-options.util';

export const RESELLER_REFRESH_TOKEN_COOKIE = 'reseller_refresh_token';
const RESELLER_REFRESH_COOKIE_PATH = '/api/v1/reseller-auth';

export function setResellerRefreshTokenCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  const expiresIn = configService.get<string>('jwt.refreshExpiresIn')!;
  const maxAge = ms(expiresIn as ms.StringValue);

  res.cookie(RESELLER_REFRESH_TOKEN_COOKIE, token, {
    ...refreshCookieSecurityOptions(configService),
    path: RESELLER_REFRESH_COOKIE_PATH,
    maxAge,
  });
}

export function clearResellerRefreshTokenCookie(
  res: Response,
  configService: ConfigService,
): void {
  res.clearCookie(RESELLER_REFRESH_TOKEN_COOKIE, {
    ...refreshCookieSecurityOptions(configService),
    path: RESELLER_REFRESH_COOKIE_PATH,
  });
}
