import { IsString, IsOptional, IsBoolean, IsInt, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePodcastDto {
  @ApiProperty({ example: 'Programming Tips Episode 1' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Learn programming tips and tricks' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'podcast-episode-1.mp3' })
  @IsString()
  audioFile: string;

  @ApiProperty({ example: 1800 })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
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
  @IsInt()
  duration?: number;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
