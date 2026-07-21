import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CustomerJwtAccessGuard extends AuthGuard('customer-jwt-access') {}
