import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ForbiddenException, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { CreateVideoDto, UpdateVideoDto } from './dto/video.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';
import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';
import { UrlService } from '../common/services/url.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Videos')
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly urlService: UrlService,
    private readonly configService: ConfigService,
  ) {}

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
    const baseUrl = this.urlService.getBaseUrl();
    // Extract token from Authorization header and add to query parameter for video streaming
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const encodedToken = encodeURIComponent(token);
    // Add /api prefix since we have global prefix configured
    const streamUrl = `${baseUrl}/api/videos/${id}/stream?token=${encodedToken}`;
    
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

  @Get(':id/stream-test')
  @ApiOperation({ summary: 'Test stream video WITHOUT authentication (for debugging)' })
  @ApiResponse({ status: 200, description: 'Video stream started' })
  @ApiResponse({ status: 206, description: 'Partial content' })
  @ApiResponse({ status: 404, description: 'Video file not found' })
  async streamVideoTest(
    @Param('id') id: string,
    @Res() res: Response,
    @Headers('range') range?: string,
    @Query('quality') quality?: string,
  ) {
    try {
      console.log(`[TEST] Streaming video ID: ${id} (NO AUTH)`);

      // Get raw video data (with filename, not URL) for file access
      const video = await this.videosService.findOneRaw(id);
      
      if (!video || !video.videoFile) {
        console.error(`[TEST] Video not found or videoFile is missing. Video ID: ${id}`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: 'Video file not specified' });
      }

      console.log(`[TEST] Video file: ${video.videoFile}`);

      // Handle different video file formats
      let videoPath: string;
      let isExternalUrl = false;

      if (video.videoFile.startsWith('http://') || video.videoFile.startsWith('https://')) {
        // Check if it's an internal URL (same domain)
        const baseUrl = this.urlService.getBaseUrl();
        if (video.videoFile.startsWith(baseUrl)) {
          // Try to find the file locally first
          const urlPath = new URL(video.videoFile).pathname;
          videoPath = join('/app', urlPath);
          console.log(`[TEST] Converted internal URL to local path: ${videoPath}`);

          // If local file doesn't exist, redirect to the URL
          if (!existsSync(videoPath)) {
            console.log(`[TEST] Local file not found, redirecting to: ${video.videoFile}`);
            return res.redirect(video.videoFile);
          }
        } else {
          // External URL - reject
          console.error(`[TEST] External URLs are not supported. Video ID: ${id}, videoFile: ${video.videoFile}`);
          res.setHeader('Content-Type', 'application/json');
          return res.status(400).json({ error: 'External URLs are not supported. Only internal uploads are allowed.' });
        }
      } else if (video.videoFile.startsWith('/')) {
        // Absolute path
        videoPath = video.videoFile;
      } else if (video.videoFile.startsWith('uploads/') || video.videoFile.startsWith('./uploads/')) {
        // Path already includes uploads directory
        videoPath = join(process.cwd(), video.videoFile.replace(/^\.\//, ''));
      } else {
        // Relative path - assume it's in uploads directory
        videoPath = join(process.cwd(), 'uploads', video.videoFile);
      }

      console.log(`[TEST] Attempting to stream from path: ${videoPath}`);
      
      // Check if file exists
      if (!existsSync(videoPath)) {
        console.error(`[TEST] Video file does not exist at path: ${videoPath}`);
        // Try alternative paths
        const urlObj = new URL(video.videoFile);
        const urlPath = urlObj.pathname;
        const altPaths = [
          join('/app', urlPath), // Docker path
          join(process.cwd(), urlPath.replace(/^\//, '')), // Relative to cwd
          join(process.cwd(), 'uploads', urlPath.replace(/^\/uploads\//, '')), // In uploads folder
          join('/app/uploads', urlPath.replace(/^\/uploads\//, '')), // Docker uploads
        ];
        
        for (const altPath of altPaths) {
          if (existsSync(altPath)) {
            console.log(`[TEST] Found video at alternative path: ${altPath}`);
            videoPath = altPath;
            break;
          }
        }
        
        if (!existsSync(videoPath)) {
          console.error(`[TEST] Video file not found at any path. Tried: ${videoPath}, ${altPaths.join(', ')}`);
          res.setHeader('Content-Type', 'application/json');
          return res.status(404).json({
            error: 'Video file not found',
            videoFile: video.videoFile,
            attemptedPaths: [videoPath, ...altPaths]
          });
        }
      }

      // If a specific quality is requested (e.g. 720p, 480p), try to use a variant file
      if (quality) {
        const dotIndex = videoPath.lastIndexOf('.');
        const qualityPath =
          dotIndex !== -1
            ? `${videoPath.slice(0, dotIndex)}-${quality}${videoPath.slice(dotIndex)}`
            : `${videoPath}-${quality}`;

        if (existsSync(qualityPath)) {
          console.log(`[TEST] Using quality variant "${quality}" at path: ${qualityPath}`);
          videoPath = qualityPath;
        } else {
          console.log(`[TEST] Quality variant "${quality}" not found, falling back to original file`);
        }
      }
      
      const stat = statSync(videoPath);
      const fileSize = stat.size;
      console.log(`[TEST] Video file size: ${fileSize} bytes`);
      
      // Check if file is empty
      if (fileSize === 0) {
        console.error(`[TEST] Video file is empty (0 bytes) at path: ${videoPath}`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({
          error: 'Video file is empty or corrupted',
          videoFile: video.videoFile,
          path: videoPath,
          size: fileSize
        });
      }
      
      // Determine content type based on file extension
      const ext = videoPath.split('.').pop()?.toLowerCase();
      const contentType = ext === 'webm' ? 'video/webm' : 
                         ext === 'mov' ? 'video/quicktime' : 
                         ext === 'avi' ? 'video/x-msvideo' : 'video/mp4';
      
      // CORS headers are handled globally in main.ts
      // Only expose headers for video streaming
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;
        
        // Validate range
        if (start < 0 || start >= fileSize || end < start || end >= fileSize) {
          res.setHeader('Content-Type', 'application/json');
          return res.status(416).json({
            error: 'Range Not Satisfiable',
            contentRange: `bytes */${fileSize}`
          });
        }
        
        const chunksize = (end - start) + 1;
        
        const file = createReadStream(videoPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
          'Content-Disposition': 'inline',
          'X-Content-Type-Options': 'nosniff',
        };
        
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
          'Content-Disposition': 'inline',
          'X-Content-Type-Options': 'nosniff',
        };
        
        res.writeHead(200, head);
        createReadStream(videoPath).pipe(res);
      }
    } catch (error: any) {
      console.error('[TEST] Video stream error:', error.message);
      console.error('[TEST] Error stack:', error.stack);
      if (!res.headersSent) {
        res.status(404).json({ 
          error: 'Video file not found',
          message: error.message
        });
      }
    }
  }

  @Get(':id/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stream video with range support (requires access)' })
  @ApiResponse({ status: 200, description: 'Video stream started' })
  @ApiResponse({ status: 206, description: 'Partial content' })
  @ApiResponse({ status: 402, description: 'Payment required' })
  @ApiResponse({ status: 404, description: 'Video file not found' })
  async streamVideo(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
    @Headers('range') range?: string,
    @Query('quality') quality?: string,
  ) {
    try {
      const hasAccess = await this.videosService.checkVideoAccess(req.user.id, id);

      if (!hasAccess) {
        // Get video details to provide payment link if available
        const video = await this.videosService.findOneRaw(id);
        const paymentLink = video?.courseId ? `${this.urlService.getBaseUrl()}/courses/${video.courseId}` : null;

        res.setHeader('Content-Type', 'application/json');
        return res.status(402).json({
          error: 'Payment required',
          message: 'You need to purchase this course to access this video',
          paymentLink: paymentLink
        });
      }

      // Get raw video data (with filename, not URL) for file access
      const video = await this.videosService.findOneRaw(id);
      
      if (!video || !video.videoFile) {
        console.error(`Video not found or videoFile is missing. Video ID: ${id}`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: 'Video file not specified' });
      }

      console.log(`Streaming video ID: ${id}, videoFile: ${video.videoFile}`);

      // Handle different video file formats
      let videoPath: string;
      let isExternalUrl = false;

      if (video.videoFile.startsWith('http://') || video.videoFile.startsWith('https://')) {
        // Check if it's an internal URL (same domain)
        const baseUrl = this.urlService.getBaseUrl();
        if (video.videoFile.startsWith(baseUrl)) {
          // Convert internal URL to local file path
          const urlPath = new URL(video.videoFile).pathname;
          // In Docker, files are typically in /app/uploads/
          videoPath = join('/app', urlPath);
          console.log(`Converted internal URL to local path: ${videoPath}`);

          // If local file doesn't exist, redirect to the URL
          if (!existsSync(videoPath)) {
            console.log(`Local file not found, redirecting to: ${video.videoFile}`);
            return res.redirect(video.videoFile);
          }
        } else {
          // External URL - reject
          console.error(`External URLs are not supported. Video ID: ${id}, videoFile: ${video.videoFile}`);
          res.setHeader('Content-Type', 'application/json');
          return res.status(400).json({ error: 'External URLs are not supported. Only internal uploads are allowed.' });
        }
      } else if (video.videoFile.startsWith('/')) {
        // Absolute path
        videoPath = video.videoFile;
      } else if (video.videoFile.startsWith('uploads/') || video.videoFile.startsWith('./uploads/')) {
        // Path already includes uploads directory
        videoPath = join(process.cwd(), video.videoFile.replace(/^\.\//, ''));
      } else {
        // Relative path - assume it's in uploads directory
        videoPath = join(process.cwd(), 'uploads', video.videoFile);
      }

      console.log(`Attempting to stream from path: ${videoPath}`);
      
      // Check if file exists
      if (!existsSync(videoPath)) {
        console.error(`Video file does not exist at path: ${videoPath}`);
        // Try alternative paths
        const urlObj = new URL(video.videoFile);
        const urlPath = urlObj.pathname;
        const altPaths = [
          join('/app', urlPath), // Docker path
          join(process.cwd(), urlPath.replace(/^\//, '')), // Relative to cwd
          join(process.cwd(), 'uploads', urlPath.replace(/^\/uploads\//, '')), // In uploads folder
          join('/app/uploads', urlPath.replace(/^\/uploads\//, '')), // Docker uploads
        ];
        
        for (const altPath of altPaths) {
          if (existsSync(altPath)) {
            console.log(`Found video at alternative path: ${altPath}`);
            videoPath = altPath;
            break;
          }
        }
        
        if (!existsSync(videoPath)) {
          console.error(`Video file not found at any path. Tried: ${videoPath}, ${altPaths.join(', ')}`);
          res.setHeader('Content-Type', 'application/json');
          return res.status(404).json({
            error: 'Video file not found',
            videoFile: video.videoFile,
            attemptedPaths: [videoPath, ...altPaths]
          });
        }
      }

      // If a specific quality is requested (e.g. 720p, 480p), try to use a variant file
      if (quality) {
        const dotIndex = videoPath.lastIndexOf('.');
        const qualityPath =
          dotIndex !== -1
            ? `${videoPath.slice(0, dotIndex)}-${quality}${videoPath.slice(dotIndex)}`
            : `${videoPath}-${quality}`;

        if (existsSync(qualityPath)) {
          console.log(`Using quality variant "${quality}" at path: ${qualityPath}`);
          videoPath = qualityPath;
        } else {
          console.log(`Quality variant "${quality}" not found, falling back to original file`);
        }
      }
      
      const stat = statSync(videoPath);
      const fileSize = stat.size;
      console.log(`Video file size: ${fileSize} bytes`);
      
      // Check if file is empty
      if (fileSize === 0) {
        console.error(`Video file is empty (0 bytes) at path: ${videoPath}`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({
          error: 'Video file is empty or corrupted',
          videoFile: video.videoFile,
          path: videoPath,
          size: fileSize
        });
      }
      
      // Determine content type based on file extension
      const ext = videoPath.split('.').pop()?.toLowerCase();
      const contentType = ext === 'webm' ? 'video/webm' : 
                         ext === 'mov' ? 'video/quicktime' : 
                         ext === 'avi' ? 'video/x-msvideo' : 'video/mp4';
      
      // CORS headers are handled globally in main.ts
      // Only expose headers for video streaming
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;
        
        // Validate range
        if (start < 0 || start >= fileSize || end < start || end >= fileSize) {
          res.setHeader('Content-Type', 'application/json');
          return res.status(416).json({
            error: 'Range Not Satisfiable',
            contentRange: `bytes */${fileSize}`
          });
        }
        
        const chunksize = (end - start) + 1;
        
        const file = createReadStream(videoPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          'Content-Disposition': 'inline',
          'X-Content-Type-Options': 'nosniff',
        };
        
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          'Content-Disposition': 'inline',
          'X-Content-Type-Options': 'nosniff',
        };
        
        res.writeHead(200, head);
        createReadStream(videoPath).pipe(res);
      }
    } catch (error: any) {
      console.error('Video stream error:', error.message);
      console.error('Error stack:', error.stack);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(404).json({
          error: 'Video file not found',
          message: error.message
        });
      }
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

  private async proxyVideoStream(videoUrl: string, res: Response, range?: string) {
    try {
      console.log(`Proxying video from URL: ${videoUrl}`);

      // Prepare headers for the request
      const headers: Record<string, string> = {
        'User-Agent': 'VideoStreamProxy/1.0',
      };

      if (range) {
        headers['Range'] = range;
      }

      const response = await fetch(videoUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.error(`Failed to fetch video: ${response.status} ${response.statusText}`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).json({
          error: 'Failed to fetch video from remote server',
          status: response.status
        });
      }

      // Get content type
      const contentType = response.headers.get('content-type') || 'video/mp4';
      const contentLength = response.headers.get('content-length');
      const acceptRanges = response.headers.get('accept-ranges');

      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      if (acceptRanges) {
        res.setHeader('Accept-Ranges', acceptRanges);
      }

      // Handle range requests
      if (range && response.status === 206) {
        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          res.setHeader('Content-Range', contentRange);
        }
        res.status(206);
      } else {
        res.status(200);
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const stream = new ReadableStream({
        start(controller) {
          function pump() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              pump();
            }).catch(err => {
              console.error('Stream error:', err);
              controller.error(err);
            });
          }
          pump();
        }
      });

      // Convert ReadableStream to Node.js stream and pipe to response
      const webStream = stream;
      const nodeStream = new (require('stream').Readable)();

      const reader2 = webStream.getReader();
      reader2.read().then(function process({ done, value }) {
        if (done) {
          nodeStream.push(null);
          return;
        }
        nodeStream.push(Buffer.from(value));
        return reader2.read().then(process);
      });

      nodeStream.pipe(res);

    } catch (error) {
      console.error('Proxy streaming error:', error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
          error: 'Video streaming failed',
          message: error.message
        });
      }
    }
  }
}
