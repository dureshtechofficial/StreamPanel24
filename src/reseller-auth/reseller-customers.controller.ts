import {
  Body,
  Controller,
  Delete,
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
import { ResellerJwtAccessGuard } from './guards/reseller-jwt-access.guard';
import { CurrentReseller } from './decorators/current-reseller.decorator';
import { Reseller } from '../resellers/entities/reseller.entity';
import { CustomersService } from '../customers/customers.service';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { UpdateCustomerDto } from '../customers/dto/update-customer.dto';
import { QueryCustomerDto } from '../customers/dto/query-customer.dto';

@ApiTags('reseller-auth')
@ApiBearerAuth('access-token')
@UseGuards(ResellerJwtAccessGuard)
@Controller('reseller-auth/customers')
export class ResellerCustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiOperation({
    summary:
      "List the current reseller's own customers (paginated, searchable, filterable by status)",
  })
  @Get()
  findAll(
    @CurrentReseller() reseller: Reseller,
    @Query() query: QueryCustomerDto,
  ) {
    return this.customersService.findAllForReseller(reseller.id, query);
  }

  @ApiOperation({ summary: "Get one of the reseller's own customers" })
  @Get(':id')
  findOne(@CurrentReseller() reseller: Reseller, @Param('id') id: string) {
    return this.customersService.findOneForReseller(reseller.id, id);
  }

  @ApiOperation({
    summary:
      'Create a customer under the current reseller — reseller_id is always taken from the token, never the request body',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentReseller() reseller: Reseller,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.createForReseller(reseller.id, dto);
  }

  @ApiOperation({ summary: "Update one of the reseller's own customers" })
  @Patch(':id')
  update(
    @CurrentReseller() reseller: Reseller,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateForReseller(reseller.id, id, dto);
  }

  @ApiOperation({
    summary:
      'Soft-delete one of the reseller\'s own customers (sets status to "deleted", never removes the row)',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentReseller() reseller: Reseller,
    @Param('id') id: string,
  ): Promise<void> {
    await this.customersService.removeForReseller(reseller.id, id);
  }
}
