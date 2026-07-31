import { Module } from '@nestjs/common';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { EntitiesController } from './entities.controller';
import { EntitiesService } from './entities.service';

@Module({
  imports: [ThingsboardModule],
  controllers: [EntitiesController],
  providers: [EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
