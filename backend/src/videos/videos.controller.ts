import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ForbiddenException, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { CreateVideoDto, UpdateVideoDto } from './dto/video.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';
import { createReadStream, statSync } from 'fs';
import { join } from 'path';

@ApiTags('Videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new video (Admin only)' })
  @ApiResponse({ status: 201, description: 'Video created successfully' })
  async create(@Body() createVideoDto: CreateVideoDto) {
    return this.videosService.create(createVideoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all videos' })
  @ApiResponse({ status: 200, description: 'Videos retrieved successfully' })
  async findAll(@Query('courseId') courseId?: string) {
    if (courseId) {
      return this.videosService.findByCourse(courseId);
    }
    return this.videosService.findAll();
  }

  @Get('my-videos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user accessible videos' })
  @ApiResponse({ status: 200, description: 'User videos retrieved successfully' })
  async getMyVideos(@Request() req) {
    return this.videosService.getUserAccessibleVideos(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video by ID' })
  @ApiResponse({ status: 200, description: 'Video retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.videosService.findOne(id);
  }

  @Get(':id/stream-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video stream URL (requires access)' })
  @ApiResponse({ status: 200, description: 'Video stream URL retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getVideoStreamUrl(@Param('id') id: string, @Request() req) {
    const hasAccess = await this.videosService.checkVideoAccess(req.user.id, id);
    
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this video');
    }

    const video = await this.videosService.findOne(id);
    const streamUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/videos/${id}/stream`;
    
    return {
      videoId: video.id,
      streamUrl,
      title: video.title,
      description: video.description,
      duration: video.duration,
      thumbnail: video.thumbnail,
      courseId: video.courseId,
      order: video.order,
      published: video.published,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    };
  }

  @Get(':id/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stream video with range support (requires access)' })
  @ApiResponse({ status: 200, description: 'Video stream started' })
  @ApiResponse({ status: 206, description: 'Partial content' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async streamVideo(
    @Param('id') id: string, 
    @Request() req, 
    @Res() res: Response,
    @Headers('range') range?: string
  ) {
    const hasAccess = await this.videosService.checkVideoAccess(req.user.id, id);
    
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this video');
    }

    const video = await this.videosService.findOne(id);
    const videoPath = join(process.cwd(), 'uploads', video.videoFile);
    
    try {
      const stat = statSync(videoPath);
      const fileSize = stat.size;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        const file = createReadStream(videoPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        
        res.writeHead(200, head);
        createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      res.status(404).send('Video file not found');
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update video (Admin only)' })
  @ApiResponse({ status: 200, description: 'Video updated successfully' })
  async update(@Param('id') id: string, @Body() updateVideoDto: UpdateVideoDto) {
    return this.videosService.update(id, updateVideoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete video (Admin only)' })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.videosService.remove(id);
  }
}
