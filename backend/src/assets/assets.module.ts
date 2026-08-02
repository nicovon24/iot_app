import { Module } from '@nestjs/common';
import { EntitiesModule } from '../entities/entities.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [EntitiesModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
