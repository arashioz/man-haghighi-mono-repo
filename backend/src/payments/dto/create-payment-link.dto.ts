import { IsNumber, IsString, IsNotEmpty, IsOptional, Min, Matches, IsBoolean } from 'class-validator';

export class CreatePaymentLinkDto {
  @IsString()
  @IsNotEmpty()
@Matches(/^[^0-9\u0660-\u0669\u06F0-\u06F9]+$/, {
  message: 'نام و نام خانوادگی نمی‌تواند شامل عدد باشد'
})
  customerName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^09[0-9]{9}$/, {
    message: 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد'
  })
  customerMobile: string;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  workshopTitle?: string;

  @IsBoolean()
  @IsOptional()
  isAggregate?: boolean;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @IsOptional()
  aggregateCount?: number;
}
