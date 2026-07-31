import { Module } from '@nestjs/common';
import { EntitiesModule } from '../entities/entities.module';
import { AssetsController } from './assets.controller';

@Module({
  imports: [EntitiesModule],
  controllers: [AssetsController],
})
export class AssetsModule {}
