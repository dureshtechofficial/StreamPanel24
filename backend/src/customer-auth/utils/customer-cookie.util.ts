import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import ms from 'ms';
import { refreshCookieSecurityOptions } from '../../common/utils/refresh-cookie-options.util';

export const CUSTOMER_REFRESH_TOKEN_COOKIE = 'customer_refresh_token';
const CUSTOMER_REFRESH_COOKIE_PATH = '/api/v1/customer-auth';

export function setCustomerRefreshTokenCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  const expiresIn = configService.get<string>('jwt.refreshExpiresIn')!;
  const maxAge = ms(expiresIn as ms.StringValue);

  res.cookie(CUSTOMER_REFRESH_TOKEN_COOKIE, token, {
    ...refreshCookieSecurityOptions(configService),
    path: CUSTOMER_REFRESH_COOKIE_PATH,
    maxAge,
  });
}

export function clearCustomerRefreshTokenCookie(
  res: Response,
  configService: ConfigService,
): void {
  res.clearCookie(CUSTOMER_REFRESH_TOKEN_COOKIE, {
    ...refreshCookieSecurityOptions(configService),
    path: CUSTOMER_REFRESH_COOKIE_PATH,
  });
}
