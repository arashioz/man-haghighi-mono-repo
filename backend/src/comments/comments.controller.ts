import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminUpdateCommentDto } from './dto/admin-update-comment.dto';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('articles/:articleId')
  @ApiOperation({ summary: 'List published comments for an article' })
  async listArticle(@Param('articleId') articleId: string) {
    return this.commentsService.listPublished('ARTICLE', articleId);
  }

  @Post('articles/:articleId')
  @ApiOperation({ summary: 'Create a comment for an article (pending, needs admin publish)' })
  async createArticle(@Param('articleId') articleId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.createForTarget('ARTICLE', articleId, dto);
  }

  @Get('podcasts/:podcastId')
  @ApiOperation({ summary: 'List published comments for a podcast' })
  async listPodcast(@Param('podcastId') podcastId: string) {
    return this.commentsService.listPublished('PODCAST', podcastId);
  }

  @Post('podcasts/:podcastId')
  @ApiOperation({ summary: 'Create a comment for a podcast (pending, needs admin publish)' })
  async createPodcast(@Param('podcastId') podcastId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.createForTarget('PODCAST', podcastId, dto);
  }

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'List published comments for a course' })
  async listCourse(@Param('courseId') courseId: string) {
    return this.commentsService.listPublished('COURSE', courseId);
  }

  @Post('courses/:courseId')
  @ApiOperation({ summary: 'Create a comment for a course (pending, needs admin publish)' })
  async createCourse(@Param('courseId') courseId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.createForTarget('COURSE', courseId, dto);
  }
}

@ApiTags('Admin Comments')
@Controller('admin/comments')
export class AdminCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: list comments with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'targetType', required: false, enum: ['ARTICLE', 'PODCAST', 'COURSE'] })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiQuery({ name: 'targetId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async adminList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('targetType') targetType?: 'ARTICLE' | 'PODCAST' | 'COURSE',
    @Query('isPublished') isPublished?: string,
    @Query('targetId') targetId?: string,
    @Query('search') search?: string,
  ) {
    return this.commentsService.adminList({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      targetType,
      isPublished: typeof isPublished === 'string' ? isPublished === 'true' : undefined,
      targetId,
      search,
    });
  }

  @Patch(':commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: edit/publish/unpublish comment' })
  async update(
    @Param('commentId') commentId: string,
    @Body() dto: AdminUpdateCommentDto,
    @Request() req: any,
  ) {
    return this.commentsService.adminUpdate(commentId, dto, req.user.id);
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: delete comment' })
  async remove(@Param('commentId') commentId: string) {
    return this.commentsService.adminDelete(commentId);
  }

  @Post(':commentId/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: reply to a comment' })
  async reply(
    @Param('commentId') commentId: string,
    @Body() dto: { content: string },
    @Request() req: any,
  ) {
    const parent = await this.commentsService.findOne(commentId);
    if (!parent) {
      throw new NotFoundException('Comment not found');
    }
    
    // Create reply as admin (auto-published)
    return this.commentsService.createForTarget(
      parent.targetType,
      parent.targetId,
      {
        authorName: 'مدیر سایت',
        content: dto.content,
        parentId: commentId,
      },
      true, // Auto-publish admin replies
      req.user.id,
    );
  }
}


