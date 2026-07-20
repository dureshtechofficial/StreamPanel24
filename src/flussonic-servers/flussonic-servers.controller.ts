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
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { FlussonicServersService } from './flussonic-servers.service';
import { CreateFlussonicServerDto } from './dto/create-flussonic-server.dto';
import { UpdateFlussonicServerDto } from './dto/update-flussonic-server.dto';
import { QueryFlussonicServerDto } from './dto/query-flussonic-server.dto';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('flussonic-servers')
export class FlussonicServersController {
  constructor(private readonly serversService: FlussonicServersService) {}

  @Get()
  findAll(@Query() query: QueryFlussonicServerDto) {
    return this.serversService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serversService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFlussonicServerDto) {
    return this.serversService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFlussonicServerDto) {
    return this.serversService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.serversService.remove(id);
  }
}
