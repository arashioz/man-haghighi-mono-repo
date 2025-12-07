import { IsString, IsOptional, IsBoolean, IsInt, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreatePodcastDto {
  @ApiProperty({ example: 'Programming Tips Episode 1' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Learn programming tips and tricks' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'podcast-episode-1.mp3', required: false })
  @IsOptional()
  @IsString()
  audioFile?: string;

  @ApiProperty({ example: 'podcast-cover.jpg', required: false })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ example: 1800 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
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

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
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

export class UpdatePodcastDto {
  @ApiProperty({ example: 'Updated Podcast Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'new-podcast-episode.mp3' })
  @IsOptional()
  @IsString()
  audioFile?: string;

  @ApiProperty({ example: 2000 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
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

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z' })
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
