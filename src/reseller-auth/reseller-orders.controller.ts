import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResellerJwtAccessGuard } from './guards/reseller-jwt-access.guard';
import { CurrentReseller } from './decorators/current-reseller.decorator';
import { Reseller } from '../resellers/entities/reseller.entity';
import { CustomersService } from '../customers/customers.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';

@ApiTags('reseller-auth')
@ApiBearerAuth('access-token')
@UseGuards(ResellerJwtAccessGuard)
@Controller('reseller-auth/customers/:customerId/orders')
export class ResellerOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly customersService: CustomersService,
  ) {}

  @ApiOperation({ summary: "List one of the reseller's customers' orders" })
  @Get()
  async findAll(
    @CurrentReseller() reseller: Reseller,
    @Param('customerId') customerId: string,
  ) {
    await this.customersService.findOneForReseller(reseller.id, customerId);
    return this.ordersService.findAllForCustomer(customerId);
  }

  @ApiOperation({
    summary:
      "Create an order for one of the reseller's own customers — priced at the plan's reseller_price by default",
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentReseller() reseller: Reseller,
    @Param('customerId') customerId: string,
    @Body() dto: CreateOrderDto,
  ) {
    await this.customersService.findOneForReseller(reseller.id, customerId);
    return this.ordersService.create({
      customerId,
      resellerId: reseller.id,
      priceField: 'reseller_price',
      dto,
    });
  }

  @ApiOperation({
    summary:
      "Update the status/remark of one of the reseller's customers' orders",
  })
  @Patch(':id')
  async update(
    @CurrentReseller() reseller: Reseller,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    await this.customersService.findOneForReseller(reseller.id, customerId);
    return this.ordersService.updateStatusForCustomer(customerId, id, dto);
  }
}
