import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerStreamsController } from './customer-streams.controller';
import { FlussonicServersModule } from '../flussonic-servers/flussonic-servers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), FlussonicServersModule],
  controllers: [CustomersController, CustomerStreamsController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
