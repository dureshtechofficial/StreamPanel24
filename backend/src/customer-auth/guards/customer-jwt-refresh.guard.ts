import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CustomerJwtRefreshGuard extends AuthGuard(
  'customer-jwt-refresh',
) {}
