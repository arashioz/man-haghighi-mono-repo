import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AdminUpdateCommentDto } from './dto/admin-update-comment.dto';

type CommentTargetType = 'ARTICLE' | 'PODCAST' | 'COURSE';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  private async assertTargetAllowsComments(targetType: CommentTargetType, targetId: string) {
    if (targetType === 'ARTICLE') {
      const article = await this.prisma.article.findUnique({ where: { id: targetId } });
      if (!article || !article.published) {
        throw new NotFoundException('Article not found');
      }
      if (article.allowComments === false) {
        throw new BadRequestException('Comments are disabled for this article');
      }
      return;
    }

    if (targetType === 'PODCAST') {
      const podcast = await this.prisma.podcast.findUnique({ where: { id: targetId } });
      if (!podcast || !podcast.published) {
        throw new NotFoundException('Podcast not found');
      }
      if ((podcast as any).allowComments === false) {
        throw new BadRequestException('Comments are disabled for this podcast');
      }
      return;
    }

    if (targetType === 'COURSE') {
      const course = await this.prisma.course.findUnique({ where: { id: targetId } });
      if (!course || !course.published) {
        throw new NotFoundException('Course not found');
      }
      if ((course as any).allowComments === false) {
        throw new BadRequestException('Comments are disabled for this course');
      }
      return;
    }
  }

  async createForTarget(targetType: CommentTargetType, targetId: string, dto: CreateCommentDto) {
    await this.assertTargetAllowsComments(targetType, targetId);

    return this.prisma.comment.create({
      data: {
        targetType,
        targetId,
        authorName: dto.authorName,
        authorPhone: dto.authorPhone,
        content: dto.content,
        isPublished: false,
      },
    });
  }

  async listPublished(targetType: CommentTargetType, targetId: string) {
    // If comments are disabled for the content, return empty list (do not leak disabled state)
    try {
      await this.assertTargetAllowsComments(targetType, targetId);
    } catch (e: any) {
      if (e instanceof BadRequestException) {
        return [];
      }
      throw e;
    }

    return this.prisma.comment.findMany({
      where: {
        targetType,
        targetId,
        isPublished: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminList(params: {
    page?: number;
    limit?: number;
    targetType?: CommentTargetType;
    isPublished?: boolean;
    targetId?: string;
    search?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.targetType) where.targetType = params.targetType;
    if (typeof params.isPublished === 'boolean') where.isPublished = params.isPublished;
    if (params.targetId) where.targetId = params.targetId;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { authorName: { contains: q, mode: 'insensitive' } },
        { authorPhone: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { editedContent: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminUpdate(commentId: string, dto: AdminUpdateCommentDto, adminUserId: string) {
    const existing = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) throw new NotFoundException('Comment not found');

    const data: any = {};

    if (typeof dto.isPublished === 'boolean') {
      data.isPublished = dto.isPublished;
      if (dto.isPublished) {
        data.publishedAt = new Date();
        data.publishedById = adminUserId;
      } else {
        data.publishedAt = null;
        data.publishedById = null;
      }
    }

    if (typeof dto.editedContent === 'string') {
      data.editedContent = dto.editedContent;
      data.editedAt = new Date();
      data.editedById = adminUserId;
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data,
    });
  }

  async adminDelete(commentId: string) {
    const existing = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) throw new NotFoundException('Comment not found');
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted' };
  }
}


