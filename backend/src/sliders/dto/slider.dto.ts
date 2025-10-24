import { IsString, IsOptional, IsBoolean, IsInt, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateSliderDto {
  @ApiProperty({ example: 'Welcome to Haghighi Platform' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Discover amazing content and courses' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'slider-image.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: 'slider-video.mp4' })
  @IsOptional()
  @IsString()
  videoFile?: string;


  @ApiProperty({ example: 1 })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  })
  @IsInt()
  order?: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSliderDto {
  @ApiProperty({ example: 'Updated Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'new-slider-image.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: 'new-slider-video.mp4' })
  @IsOptional()
  @IsString()
  videoFile?: string;


  @ApiProperty({ example: 2 })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  })
  @IsInt()
  order?: number;

  @ApiProperty({ example: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
