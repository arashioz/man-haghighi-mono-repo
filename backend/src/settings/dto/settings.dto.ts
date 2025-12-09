import { IsString, IsOptional, IsBoolean, IsEmail, IsInt, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({ example: 'سایت آموزشی', required: false })
  @IsOptional()
  @IsString()
  siteName?: string;

  @ApiProperty({ example: 'توضیحات سایت', required: false })
  @IsOptional()
  @IsString()
  siteDescription?: string;

  @ApiProperty({ example: 'info@example.com', required: false })
  @IsOptional()
  @IsEmail()
  siteEmail?: string;

  @ApiProperty({ example: '09123456789', required: false })
  @IsOptional()
  @IsString()
  sitePhone?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiProperty({ example: 'سایت در حال تعمیرات است', required: false })
  @IsOptional()
  @IsString()
  maintenanceMessage?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiProperty({ example: 'kavenegar', required: false })
  @IsOptional()
  @IsString()
  smsProvider?: string;

  @ApiProperty({ example: 'api-key-here', required: false })
  @IsOptional()
  @IsString()
  smsApiKey?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiProperty({ example: 'sendgrid', required: false })
  @IsOptional()
  @IsString()
  emailProvider?: string;

  @ApiProperty({ example: 'api-key-here', required: false })
  @IsOptional()
  @IsString()
  emailApiKey?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  backupEnabled?: boolean;

  @ApiProperty({ example: 'daily', required: false })
  @IsOptional()
  @IsString()
  backupFrequency?: string;

  @ApiProperty({ example: 104857600, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUploadSize?: number;

  @ApiProperty({ example: ['image/jpeg', 'image/png'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];
}



