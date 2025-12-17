import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { createReadStream, existsSync, statSync, mkdirSync } from 'fs';
import { VideoPodcastsService } from './video-podcasts.service';
import { CreateVideoPodcastDto, UpdateVideoPodcastDto } from './dto/video-podcast.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('VideoPodcasts')
@Controller('video-podcasts')
export class VideoPodcastsController {
  constructor(private readonly videoPodcastsService: VideoPodcastsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ], {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
          // Ensure directory exists with proper permissions
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true, mode: 0o755 });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const prefix = file.fieldname === 'thumbnail' ? 'video-podcast-thumbnail' : 'video-podcast';
          cb(null, `${prefix}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
          cb(null, true);
        } else if (file.fieldname === 'thumbnail' && file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Invalid file type for ${file.fieldname}`), false);
        }
      },
      limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB
      },
    }),
  )
  @ApiOperation({ summary: 'Create a new video podcast (Admin only)' })
  @ApiResponse({ status: 201, description: 'Video podcast created successfully' })
  async create(
    @Body() createVideoPodcastDto: CreateVideoPodcastDto,
    @UploadedFiles() files: { video?: Express.Multer.File[], thumbnail?: Express.Multer.File[] },
  ) {
    const video = files?.video?.[0];
    const thumbnail = files?.thumbnail?.[0];

    if (!video) {
      throw new BadRequestException('Video file upload is required. External URLs are not allowed.');
    }

    // Reject external URLs if provided
    if (createVideoPodcastDto.videoFile && (createVideoPodcastDto.videoFile.startsWith('http://') || createVideoPodcastDto.videoFile.startsWith('https://'))) {
      throw new BadRequestException('External URLs are not allowed. Please upload the video file directly.');
    }

    return this.videoPodcastsService.create(createVideoPodcastDto, video, thumbnail);
  }

  @Get()
  @ApiOperation({ summary: 'Get all video podcasts' })
  @ApiResponse({ status: 200, description: 'Video podcasts retrieved successfully' })
  async findAll() {
    return this.videoPodcastsService.findAll();
  }

  @Get('published')
  @ApiOperation({ summary: 'Get published video podcasts' })
  @ApiResponse({ status: 200, description: 'Published video podcasts retrieved successfully' })
  async findPublished() {
    return this.videoPodcastsService.findPublished();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video podcast by ID' })
  @ApiResponse({ status: 200, description: 'Video podcast retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.videoPodcastsService.findOne(id);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream video podcast with range support' })
  @ApiResponse({ status: 200, description: 'Video stream started' })
  @ApiResponse({ status: 206, description: 'Partial content' })
  @ApiResponse({ status: 404, description: 'Video file not found' })
  async streamVideoPodcast(
    @Param('id') id: string,
    @Res() res: Response,
    @Headers('range') range?: string,
  ) {
    const videoPodcast = await this.videoPodcastsService.findOneRaw(id);

    if (!videoPodcast.videoFile) {
      return res.status(404).json({ error: 'Video file not specified' });
    }

    // Reject external URLs - only internal uploads allowed
    if (videoPodcast.videoFile.startsWith('http://') || videoPodcast.videoFile.startsWith('https://')) {
      return res.status(400).json({ error: 'External URLs are not supported. Only internal uploads are allowed.' });
    }

    let videoPath: string;
    if (videoPodcast.videoFile.startsWith('/')) {
      videoPath = videoPodcast.videoFile;
    } else if (videoPodcast.videoFile.startsWith('uploads/') || videoPodcast.videoFile.startsWith('./uploads/')) {
      videoPath = join(process.cwd(), videoPodcast.videoFile.replace(/^\.\//, ''));
    } else {
      videoPath = join(process.cwd(), 'uploads', videoPodcast.videoFile);
    }

    if (!existsSync(videoPath)) {
      const altPaths = [
        join(process.cwd(), videoPodcast.videoFile),
        join('/app/uploads', videoPodcast.videoFile),
        join('/app', videoPodcast.videoFile),
      ];

      let found = false;

      for (const altPath of altPaths) {
        if (existsSync(altPath)) {
          videoPath = altPath;
          found = true;
          break;
        }
      }

      if (!found) {
        return res.status(404).json({
          error: 'Video file not found',
          videoFile: videoPodcast.videoFile,
          attemptedPaths: [videoPath, ...altPaths],
        });
      }
    }

    const stat = statSync(videoPath);
    const fileSize = stat.size;

    if (fileSize === 0) {
      return res.status(404).json({
        error: 'Video file is empty or corrupted',
        videoFile: videoPodcast.videoFile,
        path: videoPath,
        size: fileSize,
      });
    }

    const ext = videoPath.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'webm'
        ? 'video/webm'
        : ext === 'mov'
        ? 'video/quicktime'
        : ext === 'avi'
        ? 'video/x-msvideo'
        : ext === 'mkv'
        ? 'video/x-matroska'
        : 'video/mp4';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;

      if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || end < start) {
        return res.status(416).json({
          error: 'Range Not Satisfiable',
          contentRange: `bytes */${fileSize}`,
        });
      }

      const chunkSize = end - start + 1;
      const file = createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
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
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ], {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
          // Ensure directory exists with proper permissions
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true, mode: 0o755 });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const prefix = file.fieldname === 'thumbnail' ? 'video-podcast-thumbnail' : 'video-podcast';
          cb(null, `${prefix}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
          cb(null, true);
        } else if (file.fieldname === 'thumbnail' && file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Invalid file type for ${file.fieldname}`), false);
        }
      },
      limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB
      },
    }),
  )
  @ApiOperation({ summary: 'Update video podcast (Admin only)' })
  @ApiResponse({ status: 200, description: 'Video podcast updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateVideoPodcastDto: UpdateVideoPodcastDto,
    @UploadedFiles() files: { video?: Express.Multer.File[], thumbnail?: Express.Multer.File[] },
  ) {
    const video = files?.video?.[0];
    const thumbnail = files?.thumbnail?.[0];
    return this.videoPodcastsService.update(id, updateVideoPodcastDto, video, thumbnail);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete video podcast (Admin only)' })
  @ApiResponse({ status: 200, description: 'Video podcast deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.videoPodcastsService.remove(id);
  }
}

