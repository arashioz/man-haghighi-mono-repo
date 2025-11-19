import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '09123456789', required: false })
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
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'کارشناسی ارشد', required: false })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiProperty({ example: 'دانشگاه تهران', required: false })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiProperty({ example: 'تحلیل‌گر کسب‌وکار', required: false })
  @IsOptional()
  @IsString()
  job?: string;

  @ApiProperty({ example: 'تهران', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'female', required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: 'ADMIN', enum: ['ADMIN', 'SALES_MANAGER', 'SALES_PERSON', 'USER'] })
  @IsString()
  @IsNotEmpty()
  role: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com or 09123456789' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiProperty({ example: '09123456789', required: false })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiProperty({ example: 'کارشناسی ارشد', required: false })
  @IsOptional()
  @IsString()
  education?: string | null;

  @ApiProperty({ example: 'دانشگاه تهران', required: false })
  @IsOptional()
  @IsString()
  university?: string | null;

  @ApiProperty({ example: 'تحلیل‌گر کسب‌وکار', required: false })
  @IsOptional()
  @IsString()
  job?: string | null;

  @ApiProperty({ example: 'تهران', required: false })
  @IsOptional()
  @IsString()
  state?: string | null;

  @ApiProperty({ example: 'female', required: false })
  @IsOptional()
  @IsString()
  gender?: string | null;
}
