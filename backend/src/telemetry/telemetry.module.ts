import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EntitiesModule } from '../entities/entities.module';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { TelemetryController } from './telemetry.controller';
import { TelemetryGateway } from './telemetry.gateway';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [ThingsboardModule, AuthModule, EntitiesModule],
  controllers: [TelemetryController],
  providers: [TelemetryService, TelemetryGateway],
  exports: [TelemetryService],
})
export class TelemetryModule {}
