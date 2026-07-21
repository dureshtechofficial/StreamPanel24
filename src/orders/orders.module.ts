import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PlansModule } from '../plans/plans.module';
import { CustomersModule } from '../customers/customers.module';
import { ResellersModule } from '../resellers/resellers.module';
import { FlussonicServersModule } from '../flussonic-servers/flussonic-servers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    PlansModule,
    CustomersModule,
    ResellersModule,
    FlussonicServersModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
