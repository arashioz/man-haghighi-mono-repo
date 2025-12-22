import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: 'عنوان پیام', maxLength: 120 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty({ description: 'متن پیام', maxLength: 1000 })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  body: string;

  @ApiProperty({ description: 'ارسال درون پنلی', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  sendInApp?: boolean = true;

  @ApiProperty({ description: 'ارسال پیامک', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  sendSms?: boolean = false;
}

