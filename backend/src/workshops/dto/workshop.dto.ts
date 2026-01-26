import { IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsArray, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateWorkshopDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  maxParticipants?: number;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoLinks?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audioLinks?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  createdBy: string;
}

export class UpdateWorkshopDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  maxParticipants?: number;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoLinks?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audioLinks?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateWorkshopParticipantDto {
  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  @IsNumber()
  @Min(0)
  initialPaymentAmount: number; // Initial payment amount (can be partial)

  @IsOptional()
  @IsString()
  notes?: string;
}

export class WorkshopPaymentDto {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteWorkshopPaymentDto {
  @IsString()
  participantId: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
