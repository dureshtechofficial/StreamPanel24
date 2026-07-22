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
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CustomerActionSettingsService } from '../settings/customer-action-settings.service';
import { CustomerActionActor } from '../settings/enums/customer-action-actor.enum';
import { CustomerAction } from '../settings/enums/customer-action.enum';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerActionSettingsService: CustomerActionSettingsService,
  ) {}

  @ApiOperation({
    summary: 'List customers (paginated, searchable, filterable by status)',
  })
  @Get()
  findAll(@Query() query: QueryCustomerDto) {
    return this.customersService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one customer' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a customer' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @ApiOperation({ summary: 'Update a customer' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    await this.customerActionSettingsService.assertActionEnabled(
      CustomerActionActor.ADMIN,
      CustomerAction.EDIT,
    );
    return this.customersService.update(id, dto);
  }

  @ApiOperation({
    summary:
      'Soft-delete a customer (sets status to "deleted", never removes the row)',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.customerActionSettingsService.assertActionEnabled(
      CustomerActionActor.ADMIN,
      CustomerAction.DELETE,
    );
    await this.customersService.remove(id);
  }
}
