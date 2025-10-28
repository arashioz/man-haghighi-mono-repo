import { IsString, IsOptional, IsBoolean, IsEmail, IsNotEmpty, MinLength, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '09123456789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ example: 'SALES_MANAGER', enum: ['ADMIN', 'SALES_MANAGER', 'SALES_PERSON', 'USER'] })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isOld?: boolean;
}

export class AssignSalesPersonDto {
  @ApiProperty({ example: 'sales-person-id' })
  @IsString()
  @IsNotEmpty()
  salesPersonId: string;

  @ApiProperty({ example: 'sales-manager-id' })
  @IsString()
  @IsNotEmpty()
  salesManagerId: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '09123456789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isOld?: boolean;
}

export class PaginationQueryDto {
  @ApiProperty({ example: 1, required: false, description: 'Page number (starts from 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 10, required: false, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ example: '', required: false, description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ example: 'USER', required: false, description: 'Filter by role', enum: ['ADMIN', 'SALES_MANAGER', 'SALES_PERSON', 'USER'] })
  @IsOptional()
  @IsString()
  role?: string;
}
