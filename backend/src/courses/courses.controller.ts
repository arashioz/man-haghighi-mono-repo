import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFiles, UploadedFile, Res, Headers } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, EnrollCourseDto } from './dto/course.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { createReadStream, statSync, existsSync } from 'fs';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'attachments', maxCount: 10 },
    { name: 'courseVideos', maxCount: 20 },
  ], {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|mp4|webm|mov|avi|pdf|doc|docx|txt)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Unsupported file type'), false);
      }
    },
    limits: {
      fileSize: 15 * 1024 * 1024 * 1024, // 15GB
    },
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new course (Admin only)' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFiles() files: { thumbnail?: Express.Multer.File[], video?: Express.Multer.File[], attachments?: Express.Multer.File[], courseVideos?: Express.Multer.File[], courseAudios?: Express.Multer.File[] }
  ) {
    return this.coursesService.create(createCourseDto, files);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async findAll() {
    return this.coursesService.findAll();
  }

  @Get('published')
  @ApiOperation({ summary: 'Get published courses' })
  @ApiResponse({ status: 200, description: 'Published courses retrieved successfully' })
  async findPublished() {
    return this.coursesService.findPublished();
  }

  @Get('my-courses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user enrolled courses' })
  @ApiResponse({ status: 200, description: 'User courses retrieved successfully' })
  async getMyCourses(@Request() req) {
    return this.coursesService.getUserCourses(req.user.id);
  }

  @Get(':id/intro-video/stream')
  @ApiOperation({ summary: 'Stream course intro video (public access)' })
  @ApiResponse({ status: 200, description: 'Video stream' })
  async streamIntroVideo(
    @Param('id') id: string,
    @Res() res: Response,
    @Headers('range') range?: string,
  ) {
    try {
      // Get raw course data (with filename, not URL) for file access
      const course = await this.coursesService.findOneRaw(id);
      
      if (!course || !course.videoFile) {
        console.error(`Course not found or videoFile is missing. Course ID: ${id}`);
        return res.status(404).json({ error: 'Course intro video file not specified' });
      }

      console.log(`Streaming course intro video ID: ${id}, videoFile: ${course.videoFile}`);
      
      // Check if videoFile is a URL or a local file path
      let videoPath: string;
      if (course.videoFile.startsWith('http://') || course.videoFile.startsWith('https://')) {
        // External URL - redirect to it
        console.log(`Redirecting to external URL: ${course.videoFile}`);
        return res.redirect(302, course.videoFile);
      } else if (course.videoFile.startsWith('/')) {
        // Absolute path
        videoPath = course.videoFile;
      } else if (course.videoFile.startsWith('uploads/') || course.videoFile.startsWith('./uploads/')) {
        // Path already includes uploads directory
        videoPath = join(process.cwd(), course.videoFile.replace(/^\.\//, ''));
      } else {
        // Relative path - assume it's in uploads directory
        videoPath = join(process.cwd(), 'uploads', course.videoFile);
      }

      console.log(`Attempting to stream from path: ${videoPath}`);
      
      // Check if file exists
      if (!existsSync(videoPath)) {
        console.error(`Video file does not exist at path: ${videoPath}`);
        // Try alternative paths
        const altPaths = [
          join(process.cwd(), course.videoFile),
          join('/app/uploads', course.videoFile),
          join('/app', course.videoFile),
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
          return res.status(404).json({ 
            error: 'Video file not found',
            videoFile: course.videoFile,
            attemptedPaths: [videoPath, ...altPaths]
          });
        }
      }
      
      const stat = statSync(videoPath);
      const fileSize = stat.size;
      console.log(`Course intro video file size: ${fileSize} bytes`);
      
      // Check if file is empty
      if (fileSize === 0) {
        console.error(`Video file is empty (0 bytes) at path: ${videoPath}`);
        return res.status(404).json({ 
          error: 'Video file is empty or corrupted',
          videoFile: course.videoFile,
          path: videoPath,
          size: fileSize
        });
      }
      
      // Determine content type based on file extension
      const ext = videoPath.split('.').pop()?.toLowerCase();
      const contentType = ext === 'webm' ? 'video/webm' : 
                         ext === 'mov' ? 'video/quicktime' : 
                         ext === 'avi' ? 'video/x-msvideo' : 'video/mp4';
      
      // Set CORS headers for video streaming
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;
        
        // Validate range
        if (start < 0 || start >= fileSize || end < start || end >= fileSize) {
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
          'Cache-Control': 'public, max-age=31536000, immutable',
        };
        
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        };
        
        res.writeHead(200, head);
        createReadStream(videoPath).pipe(res);
      }
    } catch (error: any) {
      console.error('Course intro video stream error:', error.message);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ 
        error: 'Error streaming video',
        message: error.message 
      });
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in course' })
  @ApiResponse({ status: 201, description: 'Successfully enrolled in course' })
  async enroll(@Param('id') courseId: string, @Request() req) {
    return this.coursesService.enrollUser({
      userId: req.user.id,
      courseId,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'attachments', maxCount: 10 },
    { name: 'courseVideos', maxCount: 20 },
    { name: 'courseAudios', maxCount: 20 },
  ], {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|mp4|webm|mov|avi|pdf|doc|docx|txt|mp3|wav|ogg|m4a|aac)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Unsupported file type'), false);
      }
    },
    limits: {
      fileSize: 15 * 1024 * 1024 * 1024, // 15GB
    },
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update course (Admin only)' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  async update(
    @Param('id') id: string, 
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFiles() files?: { thumbnail?: Express.Multer.File[], video?: Express.Multer.File[], attachments?: Express.Multer.File[], courseVideos?: Express.Multer.File[], courseAudios?: Express.Multer.File[] }
  ) {
    return this.coursesService.update(id, updateCourseDto, files);
  }

  @Patch(':id/thumbnail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('thumbnail', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `thumbnail-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload course thumbnail (Admin only)' })
  @ApiResponse({ status: 200, description: 'Thumbnail uploaded successfully' })
  async uploadThumbnail(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.coursesService.uploadThumbnail(id, file);
  }

  @Patch(':id/video')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('video', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `video-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(mp4|webm|mov|avi|mkv)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'), false);
      }
    },
    limits: { fileSize: 15 * 1024 * 1024 * 1024 }, // 15GB
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload course intro video (Admin only)' })
  @ApiResponse({ status: 200, description: 'Intro video uploaded successfully' })
  async uploadIntroVideo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.coursesService.uploadIntroVideo(id, file);
  }

  @Patch(':id/attachments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('attachments', 10, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `attachment-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(pdf|doc|docx|txt|zip|rar)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only document files are allowed'), false);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB for audio
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload course attachments (Admin only)' })
  @ApiResponse({ status: 200, description: 'Attachments uploaded successfully' })
  async uploadAttachments(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.coursesService.uploadAttachments(id, files);
  }

  @Patch(':id/courseVideos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('courseVideos', 20, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `courseVideos-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(mp4|webm|mov|avi|mkv)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'), false);
      }
    },
    limits: { fileSize: 15 * 1024 * 1024 * 1024 }, // 15GB
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload course videos (Admin only)' })
  @ApiResponse({ status: 200, description: 'Course videos uploaded successfully' })
  async uploadCourseVideos(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.coursesService.uploadCourseVideos(id, files);
  }

  @Patch(':id/courseAudios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('courseAudios', 20, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `courseAudio-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(mp3|wav|ogg|m4a|aac)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'), false);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB for audio
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload course audios (Admin only)' })
  @ApiResponse({ status: 200, description: 'Course audios uploaded successfully' })
  async uploadCourseAudios(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.coursesService.uploadCourseAudios(id, files);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course (Admin only)' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
