import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Customer } from '../../customers/entities/customer.entity';

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Customer => {
    const request = ctx.switchToHttp().getRequest<{ user: Customer }>();
    return request.user;
  },
);
