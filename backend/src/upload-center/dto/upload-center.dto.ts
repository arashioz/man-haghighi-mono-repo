import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum FileType {
  VIDEO = 'video',
  AUDIO = 'audio',
  IMAGE = 'image',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export class AssignFileToCourseDto {
  @ApiProperty({ description: 'Course ID to assign file to' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Title for the video/audio', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Description for the video/audio', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UploadedFileInfo {
  @ApiProperty()
  filename: string;

  @ApiProperty()
  path: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  sizeFormatted: string;

  @ApiProperty()
  mimetype: string;

  @ApiProperty({ enum: FileType })
  type: FileType;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  assignedToCourse?: {
    courseId: string;
    courseTitle: string;
    videoId?: string;
    audioId?: string;
  };
}






