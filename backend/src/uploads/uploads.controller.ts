import { Controller, Post, Get, UseInterceptors, UploadedFile, UseGuards, Res, Param, Req, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { Response } from 'express';
enum FileType {
  VIDEO = 'video',
  AUDIO = 'audio',
  IMAGE = 'image',
  OTHER = 'other'
}

@ApiTags('Upload Center')
@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all uploaded files' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async getAllFiles() {
    const uploadPath = join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      return [];
    }
    
    const files = fs.readdirSync(uploadPath);
    return files.map(file => {
      const stats = fs.statSync(join(uploadPath, file));
      return {
        filename: file,
        path: `/uploads/${file}`,
        size: stats.size,
        createdAt: stats.birthtime,
        type: this.getFileType(file)
      };
    });
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Download a file' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return res.download(filePath);
  }

  @Get('stream/:filename')
  @ApiOperation({ summary: 'Stream a media file' })
  @ApiResponse({ status: 200, description: 'File stream started' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async streamFile(@Req() req: Request, @Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    //@ts-ignore
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
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
      fs.createReadStream(filePath).pipe(res);
    }
  }

  private getFileType(filename: string): FileType {
    const ext = extname(filename).toLowerCase();
    if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) {
      return FileType.VIDEO;
    }
    if (['.mp3', '.wav', '.ogg'].includes(ext)) {
      return FileType.AUDIO;
    }
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      return FileType.IMAGE;
    }
    return FileType.OTHER;
  }

  private ensureUploadsDirectory(): string {
    const uploadPath = join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    return uploadPath;
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|bmp)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp, bmp)'), false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload image file (Admin only)' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 500, description: 'Upload failed' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new Error('No file uploaded');
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size exceeds 50MB limit');
      }

      const processedKey = await this.uploadsService.processImage(file.path);
      const thumbnailKey = await this.uploadsService.generateThumbnail(file.path);

      return {
        original: processedKey,
        processed: processedKey,
        thumbnail: thumbnailKey,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(mp4|webm|mov|avi|mkv|flv|wmv)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed (mp4, webm, mov, avi, mkv, flv, wmv)'), false);
      }
    },
    limits: {
      fileSize: 2 * 1024 * 1024 * 1024,
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload video file (Admin only)' })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 500, description: 'Upload failed' })
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new Error('No file uploaded');
      }

      const maxSize = 2 * 1024 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size exceeds 2GB limit');
      }

      // For videos we keep only the filename; UploadCenter + streaming use it as key under videos/
      return {
        filename: file.filename,
        path: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new Error(`Video upload failed: ${error.message}`);
    }
  }

  @Post('audio')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(mp3|wav|ogg|aac|flac|m4a)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed (mp3, wav, ogg, aac, flac, m4a)'), false);
      }
    },
    limits: {
      fileSize: 200 * 1024 * 1024,
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload audio file (Admin only)' })
  @ApiResponse({ status: 201, description: 'Audio uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 500, description: 'Upload failed' })
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new Error('No file uploaded');
      }

      const maxSize = 200 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size exceeds 200MB limit');
      }

      // For audios we keep only the filename; UploadCenter + streaming use it as key under audios/
      return {
        filename: file.filename,
        path: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new Error(`Audio upload failed: ${error.message}`);
    }
  }

  @Post(':filename/assign')
  @ApiOperation({ summary: 'Assign an audio file to a course' })
  @ApiResponse({ status: 201, description: 'Audio assigned to course successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'File or course not found' })
  async assignAudioToCourse(
    @Param('filename') filename: string,
    @Body() body: { courseId: string }
  ) {
    // Check if file exists
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: body.courseId }
    });
    if (!course) {
      throw new Error('Course not found');
    }

    // Check audio count limit (max 50 per course)
    const existingAudioCount = await this.prisma.audio.count({
      where: { courseId: body.courseId }
    });
    if (existingAudioCount >= 50) {
      throw new Error('Maximum 50 audio files per course');
    }

    // Create audio record
    const audio = await this.prisma.audio.create({
      data: {
        title: filename,
        description: `Audio file for course ${course.title}`,
        audioFile: filename,
        order: existingAudioCount + 1,
        courseId: body.courseId,
        published: course.published
      }
    });

    return {
      success: true,
      audioId: audio.id,
      filename,
      courseId: body.courseId
    };
  }

  @Post(':filename/assign-video')
  @ApiOperation({ summary: 'Assign a video file to a course' })
  @ApiResponse({ status: 201, description: 'Video assigned to course successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'File or course not found' })
  async assignVideoToCourse(
    @Param('filename') filename: string,
    @Body() body: { courseId: string }
  ) {
    // Check if file exists
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: body.courseId }
    });
    if (!course) {
      throw new Error('Course not found');
    }

    // Check video count limit (max 20 per course)
    const existingVideoCount = await this.prisma.video.count({
      where: { courseId: body.courseId }
    });
    if (existingVideoCount >= 20) {
      throw new Error('Maximum 20 video files per course');
    }

    // Create video record
    const video = await this.prisma.video.create({
      data: {
        title: filename,
        description: `Video file for course ${course.title}`,
        videoFile: filename,
        order: existingVideoCount + 1,
        courseId: body.courseId,
        published: course.published
      }
    });

    return {
      success: true,
      videoId: video.id,
      filename,
      courseId: body.courseId
    };
  }
}
