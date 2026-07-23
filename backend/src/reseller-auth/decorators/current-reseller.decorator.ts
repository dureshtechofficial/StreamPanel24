import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Reseller } from '../../resellers/entities/reseller.entity';

export const CurrentReseller = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Reseller => {
    const request = ctx.switchToHttp().getRequest<{ user: Reseller }>();
    return request.user;
  },
);
