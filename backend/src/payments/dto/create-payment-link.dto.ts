import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentLinkDto {
  @ApiProperty({ example: 'علی احمدی', description: 'Customer name' })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({ example: '09123456789', description: 'Customer mobile (11 digits)' })
  @IsNotEmpty()
  @IsString()
  customerMobile: string;

  @ApiProperty({ example: 5000000, description: 'Amount in Rials' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ example: 'پیش پرداخت کارگاه', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

