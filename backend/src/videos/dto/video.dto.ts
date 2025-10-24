import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty({ example: 'Introduction to JavaScript' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Learn the basics of JavaScript programming' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'video-file.mp4' })
  @IsString()
  videoFile: string;

  @ApiProperty({ example: 'video-thumbnail.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ example: 1800 })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ example: 'course-id-here' })
  @IsString()
  courseId: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateVideoDto {
  @ApiProperty({ example: 'Updated Video Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated video description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'new-video-file.mp4' })
  @IsOptional()
  @IsString()
  videoFile?: string;

  @ApiProperty({ example: 'new-video-thumbnail.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ example: 2000 })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiProperty({ example: 2 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
