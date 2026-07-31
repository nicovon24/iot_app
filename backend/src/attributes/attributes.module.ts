import { Module } from '@nestjs/common';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { AttributesController } from './attributes.controller';
import { AttributesService } from './attributes.service';

@Module({
  imports: [ThingsboardModule],
  controllers: [AttributesController],
  providers: [AttributesService],
  exports: [AttributesService],
})
export class AttributesModule {}
