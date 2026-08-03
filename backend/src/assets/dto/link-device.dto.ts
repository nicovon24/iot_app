import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LinkDeviceDto {
  @ApiProperty({ description: 'Existing Device id to link to this Asset via a Contains relation' })
  @IsString()
  @IsNotEmpty()
  deviceId!: string;
}
