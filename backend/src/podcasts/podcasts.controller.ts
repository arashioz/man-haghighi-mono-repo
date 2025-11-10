import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFile, UseInterceptors, Res, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PodcastsService } from './podcasts.service';
import { CreatePodcastDto, UpdatePodcastDto } from './dto/podcast.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { createReadStream, existsSync, statSync } from 'fs';

@ApiTags('Podcasts')
@Controller('podcasts')
export class PodcastsController {
  constructor(private readonly podcastsService: PodcastsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `podcast-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed (mp3, wav, ogg, m4a, aac)'), false);
      }
    },
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB
    },
  }))
  @ApiOperation({ summary: 'Create a new podcast (Admin only)' })
  @ApiResponse({ status: 201, description: 'Podcast created successfully' })
  async create(
    @Body() createPodcastDto: CreatePodcastDto,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    if (!audio && !createPodcastDto.audioFile) {
      throw new BadRequestException('Audio file upload or audio link is required');
    }

    return this.podcastsService.create(createPodcastDto, audio);
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

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream podcast audio' })
  @ApiResponse({ status: 200, description: 'Audio stream' })
  async streamPodcast(
    @Param('id') id: string,
    @Res() res: Response,
    @Headers('range') range?: string,
  ) {
    const podcast = await this.podcastsService.findOneRaw(id);

    if (!podcast || !podcast.audioFile) {
      return res.status(404).json({ error: 'Podcast audio file not specified' });
    }

    if (podcast.audioFile.startsWith('http://') || podcast.audioFile.startsWith('https://')) {
      return res.redirect(302, podcast.audioFile);
    }

    const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
    const possiblePaths = [
      podcast.audioFile.startsWith('/') ? podcast.audioFile : join(uploadPath, podcast.audioFile),
      join(process.cwd(), podcast.audioFile),
      join(process.cwd(), 'uploads', podcast.audioFile),
      join('/app/uploads', podcast.audioFile),
      join('/app', podcast.audioFile),
    ];

    let audioPath = possiblePaths.find((path) => existsSync(path));

    if (!audioPath) {
      return res.status(404).json({
        error: 'Audio file not found on server',
        audioFile: podcast.audioFile,
        attemptedPaths: possiblePaths,
      });
    }

    const stat = statSync(audioPath);
    const fileSize = stat.size;

    if (fileSize === 0) {
      return res.status(404).json({
        error: 'Audio file is empty or corrupted',
        path: audioPath,
        size: fileSize,
      });
    }

    const ext = audioPath.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'mp3' ? 'audio/mpeg' :
      ext === 'wav' ? 'audio/wav' :
      ext === 'ogg' ? 'audio/ogg' :
      ext === 'aac' ? 'audio/aac' :
      ext === 'm4a' ? 'audio/mp4' :
      'audio/mpeg';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');

    if (!range) {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      };

      res.writeHead(200, head);

      if (res.req.method === 'HEAD') {
        res.end();
        return;
      }

      createReadStream(audioPath).pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;

    if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || end < start) {
      return res.status(416).json({
        error: 'Range Not Satisfiable',
        contentRange: `bytes */${fileSize}`,
      });
    }

    const chunksize = end - start + 1;
    const file = createReadStream(audioPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    res.writeHead(206, head);

    if (res.req.method === 'HEAD') {
      res.end();
      return;
    }

    file.pipe(res);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `podcast-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed (mp3, wav, ogg, m4a, aac)'), false);
      }
    },
    limits: {
      fileSize: 500 * 1024 * 1024,
    },
  }))
  @ApiOperation({ summary: 'Update podcast (Admin only)' })
  @ApiResponse({ status: 200, description: 'Podcast updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updatePodcastDto: UpdatePodcastDto,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    return this.podcastsService.update(id, updatePodcastDto, audio);
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
