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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { QueryPlanDto } from './dto/query-plan.dto';

@ApiTags('plans')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @ApiOperation({
    summary: 'List plans (paginated, searchable, filterable by status)',
  })
  @Get()
  findAll(@Query() query: QueryPlanDto) {
    return this.plansService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one plan' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @ApiOperation({
    summary:
      'Create a plan — reseller_price is always computed from mrp/reseller_percentage server-side',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @ApiOperation({ summary: 'Update a plan' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @ApiOperation({
    summary:
      'Soft-delete a plan (sets status to "deleted", never removes the row)',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.plansService.remove(id);
  }
}
