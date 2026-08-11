import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AlarmsModule } from './alarms/alarms.module';
import { AssetsModule } from './assets/assets.module';
import { AttributesModule } from './attributes/attributes.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { CustomerScopeGuard } from './common/guards/customer-scope.guard';
import { ReaderBlockGuard } from './common/guards/reader-block.guard';
import { SessionAuthGuard } from './common/guards/session-auth.guard';
import { CustomersModule } from './customers/customers.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { DevicesModule } from './devices/devices.module';
import { EntitiesModule } from './entities/entities.module';
import { PrismaModule } from './prisma/prisma.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { ThingsboardModule } from './thingsboard/thingsboard.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ThingsboardModule,
    AuthModule,
    EntitiesModule,
    DevicesModule,
    AssetsModule,
    CustomersModule,
    AttributesModule,
    TelemetryModule,
    UsersModule,
    AlarmsModule,
    DashboardsModule,
  ],
  providers: [
    // Order matters: all three are APP_GUARD in the SAME module's providers array, which Nest
    // executes in declaration order. SessionAuthGuard MUST run first to attach
    // request.session before CustomerScopeGuard/ReaderBlockGuard read it — registering them in
    // different modules previously left the execution order undefined and silently disabled all
    // per-entity (:id route) scoping (confirmed via runtime debug on 2026-07-31). ReaderBlockGuard
    // (Phase 9.2) reads request.session too, so it must stay in this same array, after Session.
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: CustomerScopeGuard },
    { provide: APP_GUARD, useClass: ReaderBlockGuard },
  ],
})
export class AppModule {}
