import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, Matches, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../../common/decorators/match.decorator';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '09123456789', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'password123', description: 'Password for regular users. Required for USER role.' })
  @ValidateIf((o) => o.role === 'USER')
  @IsString()
  @IsNotEmpty({ message: 'Password is required for regular users' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @ApiProperty({ example: 'password123', description: 'Confirm password. Must match password.' })
  @ValidateIf((o) => o.role === 'USER')
  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required for regular users' })
  @Match('password', { message: 'Confirm password must match password' })
  confirmPassword?: string;

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
  @ApiProperty({ example: 'john@example.com or 09123456789 or username' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ 
    example: 'password123', 
    required: false,
    description: 'Optional. If provided, login with username/password. If not provided, use OTP flow (phone required).' 
  })
  @IsOptional()
  @IsString()
  password?: string;
}

export class SendOtpDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{9}$/, { message: 'Phone number must be in format 09xxxxxxxxx' })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{9}$/, { message: 'Phone number must be in format 09xxxxxxxxx' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;
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

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123', required: false, description: 'Required only if user already has a password' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{9}$/, { message: 'Phone number must be in format 09xxxxxxxxx' })
  phone: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{9}$/, { message: 'Phone number must be in format 09xxxxxxxxx' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5,6}$/, { message: 'OTP must be 5 or 6 digits' })
  otp: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @IsNotEmpty()
  @Match('newPassword', { message: 'Confirm password must match new password' })
  confirmPassword: string;
}
