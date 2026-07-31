import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { ThingsboardModule } from '../thingsboard/thingsboard.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [ThingsboardModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: SessionAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
