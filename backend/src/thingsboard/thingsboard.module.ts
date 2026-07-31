import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ThingsboardClientService } from './thingsboard-client.service';

@Module({
  providers: [RedisService, ThingsboardClientService],
  exports: [RedisService, ThingsboardClientService],
})
export class ThingsboardModule {}
