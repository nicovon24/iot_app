import { Module } from '@nestjs/common';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';

@Module({
  imports: [ThingsboardModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}
