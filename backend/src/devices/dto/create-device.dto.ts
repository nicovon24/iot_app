import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({ example: 'industrial-pump-007' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'pump-station' })
  @IsString()
  @MinLength(1)
  type!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;
}
