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
import { FlussonicServer } from './flussonic-servers/entities/flussonic-server.entity';
import { FlussonicServerStat } from './flussonic-servers/entities/flussonic-server-stat.entity';
import { FlussonicStream } from './flussonic-servers/entities/flussonic-stream.entity';
import { FlussonicStreamSession } from './flussonic-servers/entities/flussonic-stream-session.entity';
import { FlussonicServersModule } from './flussonic-servers/flussonic-servers.module';
import { SyncSchedule } from './settings/entities/sync-schedule.entity';
import { SettingsModule } from './settings/settings.module';

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
        ],
        synchronize: false,
        logging: configService.get<string>('appEnv') === 'development',
      }),
    }),
    UsersModule,
    AuthModule,
    CustomersModule,
    FlussonicServersModule,
    SettingsModule,
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
