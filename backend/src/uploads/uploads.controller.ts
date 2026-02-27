import { Controller, Post, Get, Delete, UseInterceptors, UploadedFile, UseGuards, Res, Param, Req, Body, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { diskStorage } from 'multer';
import { extname, join, resolve, normalize } from 'path';
import * as fs from 'fs';
import { Response } from 'express';
import { log } from 'console';
import { Public } from '../auth/public.decorator';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
enum FileType {
  VIDEO = 'video',
  AUDIO = 'audio',
  IMAGE = 'image',
  OTHER = 'other'
}

// لیست پسوندهای خطرناک که نباید آپلود شوند
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.php', '.jsp', '.asp', '.aspx', '.py', '.rb', '.pl', '.cgi', '.dll', '.so', '.jar', '.war', '.ps1', '.vbs', '.js', '.ts'];

// لیست MIME types مجاز
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-m4a'],
};

@ApiTags('Upload Center')
@Controller('uploads')
@ApiBearerAuth()
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly prisma: PrismaService
  ) {}

  // متد کمکی برای اعتبارسنجی مسیر فایل و جلوگیری از Path Traversal
  private validateFilePath(filename: string, subDirectory?: string): string {
    // حذف کاراکترهای خطرناک از نام فایل
    const sanitizedFilename = filename.replace(/[<>:"|?*]/g, '').replace(/\.\./g, '');
    
    if (!sanitizedFilename || sanitizedFilename.trim() === '') {
      throw new BadRequestException('Invalid filename');
    }

    // ساخت مسیر مطلق
    const basePath = subDirectory 
      ? join(process.cwd(), 'uploads', subDirectory)
      : join(process.cwd(), 'uploads');
    
    const filePath = resolve(join(basePath, sanitizedFilename));
    const resolvedBase = resolve(basePath);

    // اطمینان از اینکه فایل داخل دایرکتوری مجاز است
    if (!filePath.startsWith(resolvedBase)) {
      throw new BadRequestException('Access denied: Invalid file path');
    }

    return filePath;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all uploaded files (Admin only)' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
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

  @Delete(':filename')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete an uploaded file (Admin only)' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('filename') filename: string) {
    const filePath = this.validateFilePath(filename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // چک کردن اینکه فایل یک فایل عادی است (نه دایرکتوری)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      throw new BadRequestException('Cannot delete directories');
    }

    fs.unlinkSync(filePath);
    return { success: true, message: 'File deleted successfully' };
  }

  @Get(':filename')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download a file (Authenticated users only)' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.validateFilePath(filename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // اضافه کردن هدرهای امنیتی
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    return res.download(filePath);
  }

  @Get('stream/:filename')
  @Public() // عمومی برای استریم ویدیو/صوت دوره‌ها - فقط مسیر مجاز
  @SkipThrottle() // استریم نباید توسط ریت لیمیتینگ قطع بشه
  @ApiOperation({ summary: 'Stream a media file (Public - with path validation)' })
  @ApiResponse({ status: 200, description: 'File stream started' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 400, description: 'Invalid file path' })
  async streamFile(@Req() req: Request, @Param('filename') filename: string, @Res() res: Response) {
    // اعتبارسنجی نام فایل
    const sanitizedFilename = filename.replace(/[<>:"|?*]/g, '').replace(/\.\./g, '');
    
    if (!sanitizedFilename) {
      throw new BadRequestException('Invalid filename');
    }

    const baseUploadsPath = resolve(join(process.cwd(), 'uploads'));
    let foundFilePath: string | null = null;
    
    // Search in multiple locations
    const searchPaths = [
      join(process.cwd(), 'uploads', sanitizedFilename),                      // main uploads
      join(process.cwd(), 'uploads', 'courseVideos', sanitizedFilename),     // course videos
      join(process.cwd(), 'uploads', 'course-videos', sanitizedFilename),    // course-videos (dash)
      join(process.cwd(), 'uploads', 'images', sanitizedFilename),            // images
      join(process.cwd(), 'uploads', 'thumbnails', sanitizedFilename),         // thumbnails
    ];
    
    for (const searchPath of searchPaths) {
      const resolvedPath = resolve(searchPath);
      // Security check: ensure path is within uploads directory
      if (!resolvedPath.startsWith(baseUploadsPath)) {
        continue;
      }
      
      if (fs.existsSync(resolvedPath)) {
        foundFilePath = resolvedPath;
        break;
      }
    }
    
    // If not found in standard paths, try recursive search
    if (!foundFilePath) {
      try {
        const files = fs.readdirSync(join(process.cwd(), 'uploads'), { recursive: true }) as string[];
        const matchedFile = files.find(f => f.endsWith(sanitizedFilename));
        if (matchedFile) {
          const fullPath = join(process.cwd(), 'uploads', matchedFile);
          const resolvedPath = resolve(fullPath);
          if (resolvedPath.startsWith(baseUploadsPath)) {
            foundFilePath = resolvedPath;
          }
        }
      } catch (e) {
        // Directory might not exist
      }
    }
    
    if (!foundFilePath) {
      log(`File not found: ${sanitizedFilename}`);
      throw new NotFoundException('File not found');
    }

    this.streamFileFromPath(req, res, foundFilePath, sanitizedFilename);
  }

  private streamFileFromPath(req: Request, res: Response, filePath: string, filename: string) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    //@ts-ignore
    const range = req.headers.range;

    // Determine content type based on file extension
    const ext = extname(filename).toLowerCase();
    let contentType = 'video/mp4';
    if (['.mp3', '.wav', '.ogg'].includes(ext)) {
      contentType = 'audio/mpeg';
    } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      contentType = 'image/' + ext.substring(1);
    }

    // Add CORS headers for images to prevent ERR_BLOCKED_BY_ORB
    const corsHeaders = {
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
    };

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
        'Content-Type': contentType,
        ...corsHeaders,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        ...corsHeaders,
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
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
        const ext = extname(file.originalname).toLowerCase();
        
        // چک کردن پسوند خطرناک
        if (DANGEROUS_EXTENSIONS.includes(ext)) {
          return cb(new Error('File type not allowed for security reasons'), '');
        }
        
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      // چک کردن MIME type
      if (ALLOWED_MIME_TYPES.image.includes(file.mimetype)) {
        // چک کردن magic bytes یا پسوند فایل
        const ext = extname(file.originalname).toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        if (!allowedExts.includes(ext)) {
          return cb(new Error('Invalid file extension'), false);
        }
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp, bmp, svg)'), false);
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 500, description: 'Upload failed' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException('File size exceeds 50MB limit');
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
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }

  @Post('video')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
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
        const ext = extname(file.originalname).toLowerCase();
        
        // چک کردن پسوند خطرناک
        if (DANGEROUS_EXTENSIONS.includes(ext)) {
          return cb(new Error('File type not allowed for security reasons'), '');
        }
        
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      // چک کردن MIME type
      if (ALLOWED_MIME_TYPES.video.includes(file.mimetype)) {
        // چک کردن پسوند فایل
        const ext = extname(file.originalname).toLowerCase();
        const allowedExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
        if (!allowedExts.includes(ext)) {
          return cb(new Error('Invalid file extension'), false);
        }
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 500, description: 'Upload failed' })
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const maxSize = 2 * 1024 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException('File size exceeds 2GB limit');
      }

      // For videos we keep only the filename; UploadCenter + streaming use it as key under videos/
      return {
        filename: file.filename,
        path: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new BadRequestException(`Video upload failed: ${error.message}`);
    }
  }

  @Post('audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
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
        const ext = extname(file.originalname).toLowerCase();
        
        // چک کردن پسوند خطرناک
        if (DANGEROUS_EXTENSIONS.includes(ext)) {
          return cb(new Error('File type not allowed for security reasons'), '');
        }
        
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      // چک کردن MIME type
      if (ALLOWED_MIME_TYPES.audio.includes(file.mimetype)) {
        // چک کردن پسوند فایل
        const ext = extname(file.originalname).toLowerCase();
        const allowedExts = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'];
        if (!allowedExts.includes(ext)) {
          return cb(new Error('Invalid file extension'), false);
        }
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 500, description: 'Upload failed' })
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const maxSize = 200 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException('File size exceeds 200MB limit');
      }

      // For audios we keep only the filename; UploadCenter + streaming use it as key under audios/
      return {
        filename: file.filename,
        path: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new BadRequestException(`Audio upload failed: ${error.message}`);
    }
  }

  @Post(':filename/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign an audio file to a course (Admin only)' })
  @ApiResponse({ status: 201, description: 'Audio assigned to course successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'File or course not found' })
  async assignAudioToCourse(
    @Param('filename') filename: string,
    @Body() body: { courseId: string }
  ) {
    // Check if file exists with path validation
    const filePath = this.validateFilePath(filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: body.courseId }
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check audio count limit (max 50 per course)
    const existingAudioCount = await this.prisma.audio.count({
      where: { courseId: body.courseId }
    });
    if (existingAudioCount >= 50) {
      throw new BadRequestException('Maximum 50 audio files per course');
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign a video file to a course (Admin only)' })
  @ApiResponse({ status: 201, description: 'Video assigned to course successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'File or course not found' })
  async assignVideoToCourse(
    @Param('filename') filename: string,
    @Body() body: { courseId: string }
  ) {
    // Check if file exists with path validation
    const filePath = this.validateFilePath(filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: body.courseId }
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check video count limit (max 20 per course)
    const existingVideoCount = await this.prisma.video.count({
      where: { courseId: body.courseId }
    });
    if (existingVideoCount >= 20) {
      throw new BadRequestException('Maximum 20 video files per course');
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
