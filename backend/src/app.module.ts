import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { AttributesModule } from './attributes/attributes.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { CustomersModule } from './customers/customers.module';
import { DevicesModule } from './devices/devices.module';
import { EntitiesModule } from './entities/entities.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { ThingsboardModule } from './thingsboard/thingsboard.module';

@Module({
  imports: [
    ConfigModule,
    ThingsboardModule,
    AuthModule,
    EntitiesModule,
    DevicesModule,
    AssetsModule,
    CustomersModule,
    AttributesModule,
    TelemetryModule,
  ],
})
export class AppModule {}
