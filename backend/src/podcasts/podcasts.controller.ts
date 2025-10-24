import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PodcastsService } from './podcasts.service';
import { CreatePodcastDto, UpdatePodcastDto } from './dto/podcast.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Podcasts')
@Controller('podcasts')
export class PodcastsController {
  constructor(private readonly podcastsService: PodcastsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new podcast (Admin only)' })
  @ApiResponse({ status: 201, description: 'Podcast created successfully' })
  async create(@Body() createPodcastDto: CreatePodcastDto) {
    return this.podcastsService.create(createPodcastDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all podcasts' })
  @ApiResponse({ status: 200, description: 'Podcasts retrieved successfully' })
  async findAll() {
    return this.podcastsService.findAll();
  }

  @Get('published')
  @ApiOperation({ summary: 'Get published podcasts' })
  @ApiResponse({ status: 200, description: 'Published podcasts retrieved successfully' })
  async findPublished() {
    return this.podcastsService.findPublished();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get podcast by ID' })
  @ApiResponse({ status: 200, description: 'Podcast retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.podcastsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update podcast (Admin only)' })
  @ApiResponse({ status: 200, description: 'Podcast updated successfully' })
  async update(@Param('id') id: string, @Body() updatePodcastDto: UpdatePodcastDto) {
    return this.podcastsService.update(id, updatePodcastDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete podcast (Admin only)' })
  @ApiResponse({ status: 200, description: 'Podcast deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.podcastsService.remove(id);
  }
}
