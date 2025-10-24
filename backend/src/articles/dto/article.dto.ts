import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty({ example: 'How to Learn Programming' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'how-to-learn-programming' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'This is the article content...' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'Brief description of the article' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ example: 'featured-image.jpg' })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

export class UpdateArticleDto {
  @ApiProperty({ example: 'Updated Article Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'updated-article-slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ example: 'Updated article content...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: 'Updated excerpt' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ example: 'new-featured-image.jpg' })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
