import { IsString, IsOptional, IsBoolean, IsNumber, IsDecimal } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({ example: 'Complete JavaScript Course' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Learn JavaScript from beginner to advanced' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 99.99 })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'course-thumbnail.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ example: 'course-intro-video.mp4' })
  @IsOptional()
  @IsString()
  videoFile?: string;

  @ApiProperty({ example: ['file1.pdf', 'file2.doc'] })
  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];

  @ApiProperty({ example: ['video1.mp4', 'video2.mp4'] })
  @IsOptional()
  @IsString({ each: true })
  courseVideos?: string[];

  @ApiProperty({ example: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateCourseDto {
  @ApiProperty({ example: 'Updated Course Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 149.99 })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ example: 'new-course-thumbnail.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ example: 'new-course-intro-video.mp4' })
  @IsOptional()
  @IsString()
  videoFile?: string;

  @ApiProperty({ example: ['file1.pdf', 'file2.doc'] })
  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];

  @ApiProperty({ example: ['video1.mp4', 'video2.mp4'] })
  @IsOptional()
  @IsString({ each: true })
  courseVideos?: string[];

  @ApiProperty({ example: false })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class EnrollCourseDto {
  @ApiProperty({ example: 'user-id-here' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'course-id-here' })
  @IsString()
  courseId: string;
}
