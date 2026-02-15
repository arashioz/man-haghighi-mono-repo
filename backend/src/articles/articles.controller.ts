import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto, CreateCategoryDto, UpdateCategoryDto } from './dto/article.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new article (Admin only)' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  async create(@Body() createArticleDto: CreateArticleDto) {
    return this.articlesService.create(createArticleDto);
  }

  /** List all articles with pagination (Admin) - GET /articles */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all articles with pagination (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'published', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('published') published?: string,
  ) {
    return this.articlesService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      categoryId,
      tag,
      search,
      published: published ? published === 'true' : undefined,
    });
  }

  /** Published articles with pagination (public) - GET /articles/published */
  @Get('published')
  @ApiOperation({ summary: 'Get published articles with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Published articles retrieved successfully' })
  async findPublished(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('tag') tag?: string,
  ) {
    return this.articlesService.findPublished({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      categoryId,
      tag,
    });
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get article by slug' })
  @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.articlesService.findBySlug(slug);
  }

  @Get('categories/all')
  @ApiOperation({ summary: 'Get all article categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async findAllCategories() {
    return this.articlesService.findAllCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  async findCategory(@Param('id') id: string) {
    return this.articlesService.findCategory(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get article by ID' })
  @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Get(':id/seo-analysis')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze article SEO quality (Admin only)' })
  @ApiResponse({ status: 200, description: 'SEO analysis completed' })
  async analyzeSeo(@Param('id') id: string) {
    return this.articlesService.analyzeSeo(id);
  }

  @Get(':id/schema')
  @ApiOperation({ summary: 'Generate Schema.org JSON-LD for article' })
  @ApiResponse({ status: 200, description: 'Schema generated successfully' })
  async generateSchema(@Param('id') id: string) {
    return this.articlesService.generateSchema(id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related articles' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Related articles retrieved successfully' })
  async getRelated(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.articlesService.getRelatedArticles(
      id,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update article (Admin only)' })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  async update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return this.articlesService.update(id, updateArticleDto);
  }

  @Patch(':id/featured-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `article-image-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload featured image for article (Admin only)' })
  @ApiResponse({ status: 200, description: 'Featured image uploaded successfully' })
  async uploadFeaturedImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.articlesService.update(id, { featuredImage: file.filename });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete article (Admin only)' })
  @ApiResponse({ status: 200, description: 'Article deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }

  // Category Management
  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create article category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.articlesService.createCategory(createCategoryDto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.articlesService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async removeCategory(@Param('id') id: string) {
    return this.articlesService.removeCategory(id);
  }
}
