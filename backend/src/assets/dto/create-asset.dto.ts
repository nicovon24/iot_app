import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({ example: 'main-warehouse' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'warehouse' })
  @IsString()
  @MinLength(1)
  type!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;
}
