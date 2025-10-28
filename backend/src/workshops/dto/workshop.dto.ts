import { IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsArray } from 'class-validator';

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
