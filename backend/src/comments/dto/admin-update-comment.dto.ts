import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminUpdateCommentDto {
  @ApiProperty({ required: false, example: true, description: 'Publish/unpublish comment on main site' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true' || value === '1';
    return undefined;
  })
  @IsBoolean()
  isPublished?: boolean;

  @ApiProperty({ required: false, example: 'متن ویرایش‌شده‌ی نظر...' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  editedContent?: string;
}


