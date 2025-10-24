import { IsString, IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';

export class CreateAudioDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  audioFile: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsString()
  courseId: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateAudioDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  audioFile?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class AudioStreamInfo {
  id: string;
  title: string;
  description?: string;
  audioFile: string;
  thumbnail?: string;
  duration?: number;
  order: number;
  courseId: string;
  published: boolean;
  streamUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

