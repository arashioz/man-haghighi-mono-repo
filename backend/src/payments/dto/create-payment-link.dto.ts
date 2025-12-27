import { IsNumber, IsString, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreatePaymentLinkDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerMobile: string;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;
}
