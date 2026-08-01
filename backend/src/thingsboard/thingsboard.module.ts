import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ThingsboardClientService } from './thingsboard-client.service';
import { ThingsboardWsService } from './thingsboard-ws.service';

@Module({
  providers: [RedisService, ThingsboardClientService, ThingsboardWsService],
  exports: [RedisService, ThingsboardClientService, ThingsboardWsService],
})
export class ThingsboardModule {}
