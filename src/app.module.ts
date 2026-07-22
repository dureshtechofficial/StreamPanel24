import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { Customer } from './customers/entities/customer.entity';
import { CustomersModule } from './customers/customers.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { Reseller } from './resellers/entities/reseller.entity';
import { ResellersModule } from './resellers/resellers.module';
import { ResellerAuthModule } from './reseller-auth/reseller-auth.module';
import { FlussonicServer } from './flussonic-servers/entities/flussonic-server.entity';
import { FlussonicServerStat } from './flussonic-servers/entities/flussonic-server-stat.entity';
import { FlussonicStream } from './flussonic-servers/entities/flussonic-stream.entity';
import { FlussonicStreamSession } from './flussonic-servers/entities/flussonic-stream-session.entity';
import { FlussonicServersModule } from './flussonic-servers/flussonic-servers.module';
import { SyncSchedule } from './settings/entities/sync-schedule.entity';
import { SyncScheduleRun } from './settings/entities/sync-schedule-run.entity';
import { OrderCancelSetting } from './settings/entities/order-cancel-setting.entity';
import { CustomerActionSetting } from './settings/entities/customer-action-setting.entity';
import { SettingsModule } from './settings/settings.module';
import { Plan } from './plans/entities/plan.entity';
import { PlansModule } from './plans/plans.module';
import { Order } from './orders/entities/order.entity';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [
          User,
          Customer,
          FlussonicServer,
          FlussonicServerStat,
          FlussonicStream,
          FlussonicStreamSession,
          SyncSchedule,
          SyncScheduleRun,
          OrderCancelSetting,
          CustomerActionSetting,
          Reseller,
          Plan,
          Order,
        ],
        synchronize: false,
        logging: configService.get<string>('appEnv') === 'development',
      }),
    }),
    UsersModule,
    AuthModule,
    CustomersModule,
    CustomerAuthModule,
    ResellersModule,
    ResellerAuthModule,
    FlussonicServersModule,
    SettingsModule,
    PlansModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
