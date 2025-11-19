import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateVideoPodcastDto {
  @ApiProperty({ example: 'پادکست تصویری ۱' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'توضیحات مربوط به پادکست تصویری' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'video-podcast-123.mp4' })
  @IsOptional()
  @IsString()
  videoFile?: string;

  @ApiProperty({ example: 'video-podcast-thumbnail-123.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ example: 1800, description: 'مدت زمان به ثانیه' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return value;
  })
  @IsInt()
  duration?: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return undefined;
  })
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ example: '2024-11-12T09:00:00.000Z' })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') {
      return value;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  })
  @IsDateString()
  publishedAt?: string;
}

export class UpdateVideoPodcastDto {
  @ApiProperty({ example: 'عنوان جدید پادکست تصویری' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'توضیحات جدید برای پادکست تصویری' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'video-podcast-321.mp4' })
  @IsOptional()
  @IsString()
  videoFile?: string;

  @ApiProperty({ example: 'video-podcast-thumbnail-321.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ example: 2400 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return value;
  })
  @IsInt()
  duration?: number;

  @ApiProperty({ example: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return undefined;
  })
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ example: '2024-11-30T00:00:00.000Z' })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') {
      return value;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  })
  @IsDateString()
  publishedAt?: string | null;
}

