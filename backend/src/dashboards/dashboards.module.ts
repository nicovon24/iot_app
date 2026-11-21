import { Module } from '@nestjs/common';
import { EntitiesModule } from '../entities/entities.module';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { DashboardAiService } from './dashboard-ai.service';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';

@Module({
  imports: [ThingsboardModule, EntitiesModule, TelemetryModule],
  controllers: [DashboardsController],
  providers: [DashboardsService, DashboardAiService],
})
export class DashboardsModule {}
