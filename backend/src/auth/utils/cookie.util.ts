import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import ms from 'ms';
import { refreshCookieSecurityOptions } from '../../common/utils/refresh-cookie-options.util';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

export function setRefreshTokenCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  const expiresIn = configService.get<string>('jwt.refreshExpiresIn')!;
  const maxAge = ms(expiresIn as ms.StringValue);

  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...refreshCookieSecurityOptions(configService),
    path: REFRESH_COOKIE_PATH,
    maxAge,
  });
}

export function clearRefreshTokenCookie(
  res: Response,
  configService: ConfigService,
): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...refreshCookieSecurityOptions(configService),
    path: REFRESH_COOKIE_PATH,
  });
}
