import { IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsArray } from 'class-validator';
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
