import { Module } from '@nestjs/common';
import { EntitiesModule } from '../entities/entities.module';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';

@Module({
  imports: [ThingsboardModule, EntitiesModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}
