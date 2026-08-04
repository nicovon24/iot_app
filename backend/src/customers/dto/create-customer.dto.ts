import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class HierarchyLevelDto {
  @ApiProperty({ example: 0, description: 'Order of this level within the hierarchy, starting at 0' })
  @IsInt()
  @Min(0)
  levelIndex!: number;

  @ApiProperty({ example: 'Site' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'Test Comp', description: 'Becomes the ThingsBoard Customer title' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ required: false, description: 'Existing Customer id — creates this Customer as its sub-customer' })
  @IsOptional()
  @IsString()
  parentCustomerId?: string;

  @ApiProperty({
    type: [HierarchyLevelDto],
    description:
      'Ordered hierarchy levels for this Customer (e.g. Site → Area → Asset → Sensor). Required, non-empty, immutable after creation.',
  })
  @ValidateNested({ each: true })
  @Type(() => HierarchyLevelDto)
  @ArrayMinSize(1)
  hierarchyLevels!: HierarchyLevelDto[];
}
