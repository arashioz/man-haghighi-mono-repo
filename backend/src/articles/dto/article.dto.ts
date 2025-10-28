import { IsString, IsOptional, IsBoolean, IsArray, IsInt, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateArticleDto {
  @ApiProperty({ example: 'راهنمای جامع سئو در سال 2024' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'راهنمای-جامع-سئو-2024' })
  @IsString()
  slug: string;

  @ApiProperty({ example: '<p>محتوای کامل مقاله...</p>' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'این مقاله یک راهنمای جامع برای سئو است', required: false })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ example: 'featured-image.jpg', required: false })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  // SEO Fields
  @ApiProperty({ example: 'راهنمای جامع سئو 2024 | آموزش کامل', required: false })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiProperty({ example: 'آموزش کامل و جامع سئو برای مبتدیان تا پیشرفته', required: false })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiProperty({ example: ['سئو', 'بهینه سازی', 'گوگل'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiProperty({ example: 'سئو', required: false })
  @IsOptional()
  @IsString()
  focusKeyword?: string;

  // Open Graph
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiProperty({ default: 'article' })
  @IsOptional()
  @IsString()
  ogType?: string;

  // Twitter Card
  @ApiProperty({ default: 'summary_large_image' })
  @IsOptional()
  @IsString()
  twitterCard?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterImage?: string;

  // Schema.org
  @ApiProperty({ default: 'Article' })
  @IsOptional()
  @IsString()
  schemaType?: string;

  @ApiProperty({ example: 'محمد حقیقی', required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  authorBio?: string;

  // Content Settings
  @ApiProperty({ default: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  readingTime?: number;

  // Categories and Tags
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: ['سئو', 'دیجیتال مارکتینگ'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Related Content
  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedArticles?: string[];

  // Publishing
  @ApiProperty({ default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateArticleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  // SEO Fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  focusKeyword?: string;

  // Open Graph
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogType?: string;

  // Twitter Card
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterCard?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterImage?: string;

  // Schema.org
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  schemaType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  authorBio?: string;

  // Content Settings
  @ApiProperty({ required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  readingTime?: number;

  // Categories and Tags
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Related Content
  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedArticles?: string[];

  // Publishing
  @ApiProperty({ required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'دیجیتال مارکتینگ' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'digital-marketing' })
  @IsString()
  slug: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ default: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
