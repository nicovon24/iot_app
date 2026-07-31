import { Module } from '@nestjs/common';
import { EntitiesModule } from '../entities/entities.module';
import { DevicesController } from './devices.controller';

@Module({
  imports: [EntitiesModule],
  controllers: [DevicesController],
})
export class DevicesModule {}
