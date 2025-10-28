import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateArticleDto, UpdateArticleDto, CreateCategoryDto, UpdateCategoryDto } from './dto/article.dto';
import { SeoService } from '../common/services/seo.service';
import { UrlService } from '../common/services/url.service';

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private seoService: SeoService,
    private urlService: UrlService,
  ) {}

  async create(createArticleDto: CreateArticleDto) {
    // بهینه‌سازی slug
    const optimizedSlug = this.seoService.optimizeSlug(createArticleDto.slug);
    
    // محاسبه زمان مطالعه
    const readingTime = this.seoService.calculateReadingTime(createArticleDto.content);
    
    // تولید خودکار excerpt اگر نداشت
    const excerpt = createArticleDto.excerpt || 
      this.seoService.generateExcerpt(createArticleDto.content);
    
    // تولید خودکار metaTitle اگر نداشت
    const metaTitle = createArticleDto.metaTitle || createArticleDto.title;
    
    // تولید خودکار metaDescription اگر نداشت
    const metaDescription = createArticleDto.metaDescription || excerpt;
    
    const article = await this.prisma.article.create({
      data: {
        ...createArticleDto,
        slug: optimizedSlug,
        readingTime,
        excerpt,
        metaTitle,
        metaDescription,
        publishedAt: createArticleDto.published ? new Date() : null,
      },
      include: {
        category: true,
      },
    });

    return this.processArticleData(article);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    tag?: string;
    search?: string;
    published?: boolean;
  }) {
    const { page = 1, limit = 10, categoryId, tag, search, published } = options || {};
    
    const where: any = {};
    
    if (published !== undefined) {
      where.published = published;
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (tag) {
      where.tags = {
        has: tag,
      };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: articles.map(article => this.processArticleData(article)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublished(options?: { page?: number; limit?: number; categoryId?: string; tag?: string }) {
    return this.findAll({ ...options, published: true });
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this.processArticleData(article);
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // افزایش تعداد بازدید
    await this.prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    return this.processArticleData(article);
  }

  async update(id: string, updateArticleDto: UpdateArticleDto) {
    await this.findOne(id);
    
    const data: any = { ...updateArticleDto };
    
    // بهینه‌سازی slug اگر تغییر کرده
    if (updateArticleDto.slug) {
      data.slug = this.seoService.optimizeSlug(updateArticleDto.slug);
    }
    
    // محاسبه مجدد زمان مطالعه اگر محتوا تغییر کرده
    if (updateArticleDto.content) {
      data.readingTime = this.seoService.calculateReadingTime(updateArticleDto.content);
    }
    
    // تنظیم تاریخ انتشار
    if (updateArticleDto.published === true) {
      const article = await this.prisma.article.findUnique({ where: { id } });
      if (!article.publishedAt) {
        data.publishedAt = new Date();
      }
    } else if (updateArticleDto.published === false) {
      data.publishedAt = null;
    }
    
    const article = await this.prisma.article.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });

    return this.processArticleData(article);
  }

  async remove(id: string) {
    await this.findOne(id);
    
    return this.prisma.article.delete({
      where: { id },
    });
  }

  async analyzeSeo(id: string) {
    const article = await this.findOne(id);
    return this.seoService.analyzeSeoQuality(article);
  }

  async generateSchema(id: string) {
    const article = await this.findOne(id);
    return this.seoService.generateArticleSchema(article);
  }

  async getRelatedArticles(id: string, limit: number = 5) {
    const article = await this.findOne(id);
    
    // مقالات مرتبط بر اساس دسته‌بندی و تگ‌ها
    const related = await this.prisma.article.findMany({
      where: {
        AND: [
          { published: true },
          { id: { not: id } },
          {
            OR: [
              { categoryId: article.categoryId },
              { tags: { hasSome: article.tags } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { viewCount: 'desc' },
      include: {
        category: true,
      },
    });

    return related.map(a => this.processArticleData(a));
  }

  // Category Management
  async createCategory(createCategoryDto: CreateCategoryDto) {
    const optimizedSlug = this.seoService.optimizeSlug(createCategoryDto.slug);
    
    return this.prisma.articleCategory.create({
      data: {
        ...createCategoryDto,
        slug: optimizedSlug,
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findAllCategories() {
    return this.prisma.articleCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { articles: true },
        },
      },
    });
  }

  async findCategory(id: string) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findCategory(id);
    
    const data: any = { ...updateCategoryDto };
    
    if (updateCategoryDto.slug) {
      data.slug = this.seoService.optimizeSlug(updateCategoryDto.slug);
    }
    
    return this.prisma.articleCategory.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async removeCategory(id: string) {
    await this.findCategory(id);
    
    // بررسی اینکه آیا مقاله‌ای در این دسته وجود دارد
    const articlesCount = await this.prisma.article.count({
      where: { categoryId: id },
    });

    if (articlesCount > 0) {
      throw new BadRequestException('Cannot delete category with articles. Please reassign or delete articles first.');
    }
    
    return this.prisma.articleCategory.delete({
      where: { id },
    });
  }

  // Helper method
  private processArticleData(article: any) {
    return {
      ...article,
      featuredImage: this.urlService.getFileUrl(article.featuredImage),
      ogImage: this.urlService.getFileUrl(article.ogImage),
      twitterImage: this.urlService.getFileUrl(article.twitterImage),
    };
  }
}
