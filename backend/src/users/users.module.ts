import { Module } from '@nestjs/common';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [ThingsboardModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
