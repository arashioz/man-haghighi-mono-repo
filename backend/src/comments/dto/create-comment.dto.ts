import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'علی رضایی' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  authorName: string;

  @ApiProperty({ example: '09120000000', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  authorPhone?: string;

  @ApiProperty({ example: 'مطلب خیلی خوب و کاربردی بود. ممنون از شما.' })
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  content: string;
}


