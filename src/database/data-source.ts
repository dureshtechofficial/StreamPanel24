import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';
import { FlussonicServer } from '../flussonic-servers/entities/flussonic-server.entity';
import { FlussonicServerStat } from '../flussonic-servers/entities/flussonic-server-stat.entity';
import { FlussonicStream } from '../flussonic-servers/entities/flussonic-stream.entity';
import { FlussonicStreamSession } from '../flussonic-servers/entities/flussonic-stream-session.entity';
import { SyncSchedule } from '../settings/entities/sync-schedule.entity';
import { SyncScheduleRun } from '../settings/entities/sync-schedule-run.entity';
import { OrderCancelSetting } from '../settings/entities/order-cancel-setting.entity';
import { CustomerActionSetting } from '../settings/entities/customer-action-setting.entity';
import { Reseller } from '../resellers/entities/reseller.entity';
import { Plan } from '../plans/entities/plan.entity';
import { Order } from '../orders/entities/order.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'project7_auth',
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
    WalletTransaction,
  ],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.APP_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
