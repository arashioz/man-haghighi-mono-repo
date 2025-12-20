import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'clx0d0d0d0000000000000000', description: 'ID of the course to purchase', required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ example: 1000000, description: 'Amount in Rials (for wallet recharge or payment link)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1000) // Minimum amount for Mellat is 1000 Rials
  amount: number;

  @ApiProperty({ example: 'خرید دوره آموزش NestJS', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'WALLET_RECHARGE', enum: ['COURSE_PURCHASE', 'WALLET_RECHARGE', 'PAYMENT_LINK'], required: false })
  @IsOptional()
  @IsString()
  type?: 'COURSE_PURCHASE' | 'WALLET_RECHARGE' | 'PAYMENT_LINK';
}

