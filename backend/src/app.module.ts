import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AssetsModule } from './assets/assets.module';
import { AttributesModule } from './attributes/attributes.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { CustomerScopeGuard } from './common/guards/customer-scope.guard';
import { SessionAuthGuard } from './common/guards/session-auth.guard';
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
  providers: [
    // Order matters: both are APP_GUARD in the SAME module's providers array, which Nest
    // executes in declaration order. SessionAuthGuard MUST run first to attach
    // request.session before CustomerScopeGuard reads it — registering them in different
    // modules previously left the execution order undefined and silently disabled all
    // per-entity (:id route) scoping (confirmed via runtime debug on 2026-07-31).
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: CustomerScopeGuard },
  ],
})
export class AppModule {}
