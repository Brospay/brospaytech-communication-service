import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Base Pagination DTO
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    minimum: 1,
    maximum: 1000,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Field to sort by',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false,
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }) => value?.toUpperCase())
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  get offset(): number {
    return ((this.page || 1) - 1) * (this.limit || 20);
  }
}

/**
 * Pagination Response Metadata
 */
export class PaginationMeta {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  pages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.pages = Math.ceil(total / limit);
    this.hasNext = page < this.pages;
    this.hasPrev = page > 1;
  }
}

/**
 * Paginated Response DTO
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of items' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMeta })
  meta: PaginationMeta;

  constructor(data: T[], page: number, limit: number, total: number) {
    this.data = data;
    this.meta = new PaginationMeta(page, limit, total);
  }
}
