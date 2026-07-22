import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerJwtAccessGuard } from './guards/customer-jwt-access.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { Customer } from '../customers/entities/customer.entity';
import { OrdersService } from '../orders/orders.service';

@ApiTags('customer-auth')
@ApiBearerAuth('access-token')
@UseGuards(CustomerJwtAccessGuard)
@Controller('customer-auth/orders')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary:
      "List the current customer's own orders — id always comes from the token, never a request param",
  })
  @Get()
  findMine(@CurrentCustomer() customer: Customer) {
    return this.ordersService.findAllForCustomer(customer.id);
  }

  @ApiOperation({
    summary:
      "Cancel one of the current customer's own orders — nothing else about an order is customer-editable",
  })
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentCustomer() customer: Customer, @Param('id') id: string) {
    return this.ordersService.cancelForCustomer(customer.id, id);
  }
}
