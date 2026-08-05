import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [ThingsboardModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
