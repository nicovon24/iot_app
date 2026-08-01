import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EntitiesModule } from '../entities/entities.module';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { EntityAlarmsController, GlobalAlarmsController } from './alarms.controller';
import { AlarmsGateway } from './alarms.gateway';
import { AlarmsService } from './alarms.service';

@Module({
  imports: [ThingsboardModule, AuthModule, EntitiesModule],
  controllers: [EntityAlarmsController, GlobalAlarmsController],
  providers: [AlarmsService, AlarmsGateway],
  exports: [AlarmsService],
})
export class AlarmsModule {}
