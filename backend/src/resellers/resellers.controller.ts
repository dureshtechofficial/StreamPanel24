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
import { ResellersService } from './resellers.service';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { UpdateResellerDto } from './dto/update-reseller.dto';
import { QueryResellerDto } from './dto/query-reseller.dto';

@ApiTags('resellers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('resellers')
export class ResellersController {
  constructor(private readonly resellersService: ResellersService) {}

  @ApiOperation({
    summary: 'List resellers (paginated, searchable, filterable by status)',
  })
  @Get()
  findAll(@Query() query: QueryResellerDto) {
    return this.resellersService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one reseller' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resellersService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a reseller' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateResellerDto) {
    return this.resellersService.create(dto);
  }

  @ApiOperation({ summary: 'Update a reseller' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResellerDto) {
    return this.resellersService.update(id, dto);
  }

  @ApiOperation({
    summary:
      'Soft-delete a reseller (sets status to "deleted", never removes the row)',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.resellersService.remove(id);
  }
}
