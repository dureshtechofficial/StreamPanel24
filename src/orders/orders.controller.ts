import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { CustomersService } from '../customers/customers.service';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly customersService: CustomersService,
  ) {}

  @ApiOperation({
    summary:
      'List orders (paginated, filterable by customer/status/payment status)',
  })
  @Get()
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @ApiOperation({
    summary:
      'Reports view: paginated orders enriched with customer/plan/stream/reseller names, plus aggregate totals — for the admin reports page. Must stay declared before :id.',
  })
  @Get('reports')
  async findAllWithDetails(@Query() query: QueryOrderDto) {
    const [page, summary] = await Promise.all([
      this.ordersService.findAllWithDetails(query),
      this.ordersService.getSummary(query),
    ]);
    return { ...page, summary };
  }

  @ApiOperation({ summary: 'Get one order' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @ApiOperation({
    summary:
      "Create an order for a customer (admin route — priced at the plan's customer_price by default)",
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateOrderDto) {
    if (!dto.customer_id) {
      throw new BadRequestException('customer_id is required');
    }
    const customer = await this.customersService.findOne(dto.customer_id);
    return this.ordersService.create({
      customerId: customer.id,
      resellerId: customer.reseller_id,
      priceField: 'customer_price',
      dto,
    });
  }

  @ApiOperation({
    summary:
      "Update an order's lifecycle/payment status or remark — every other field is an immutable purchase-time snapshot",
  })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
