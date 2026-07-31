import { Module } from '@nestjs/common';
import { EntitiesModule } from '../entities/entities.module';
import { CustomersController } from './customers.controller';

@Module({
  imports: [EntitiesModule],
  controllers: [CustomersController],
})
export class CustomersModule {}
