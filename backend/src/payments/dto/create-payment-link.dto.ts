import { IsNumber, IsString, IsNotEmpty, IsOptional, Min, Matches } from 'class-validator';

export class CreatePaymentLinkDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[\u0600-\u06FF\s]+$/, {
    message: 'نام و نام خانوادگی باید فقط شامل حروف فارسی باشد'
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
}
