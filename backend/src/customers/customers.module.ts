import { Module } from '@nestjs/common';
import { EntitiesModule } from '../entities/entities.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [EntitiesModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
