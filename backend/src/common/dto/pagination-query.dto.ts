import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number (0-based). Omit both page and pageSize to fetch all.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size. Omit both page and pageSize to fetch all.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Case-insensitive substring filter on entity name/title' })
  @IsOptional()
  @IsString()
  textSearch?: string;

  @ApiPropertyOptional({ description: "Property to sort by, e.g. 'name', 'createdTime'" })
  @IsOptional()
  @IsString()
  sortProperty?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
