import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

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

  @ApiProperty({ description: 'Customer whose hierarchy this Asset belongs to' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ example: 0, description: "Which level of the Customer's hierarchy this Asset represents" })
  @IsInt()
  @Min(0)
  levelIndex!: number;

  @ApiProperty({ description: 'Parent to attach to via a Contains relation — the Customer id (level 0) or an existing Asset id' })
  @IsString()
  @IsNotEmpty()
  parentId!: string;
}
