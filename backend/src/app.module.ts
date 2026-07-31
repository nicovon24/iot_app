import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AssetsModule } from './assets/assets.module';
import { AttributesModule } from './attributes/attributes.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { CustomerScopeGuard } from './common/guards/customer-scope.guard';
import { CustomersModule } from './customers/customers.module';
import { DevicesModule } from './devices/devices.module';
import { EntitiesModule } from './entities/entities.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { ThingsboardModule } from './thingsboard/thingsboard.module';
import { UsersModule } from './users/users.module';

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
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: CustomerScopeGuard }],
})
export class AppModule {}
