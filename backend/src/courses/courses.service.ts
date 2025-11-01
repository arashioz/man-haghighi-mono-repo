import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto, EnrollCourseDto } from './dto/course.dto';
import { UrlService } from '../common/services/url.service';
import { statSync, existsSync } from 'fs';
import { join } from 'path';
import { log } from 'console';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private prisma: PrismaService,
    private urlService: UrlService,
  ) {}

  // Get actual file size from disk
  private getFileSize(filename: string, fallbackSize?: number): number {
    const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
    const filePath = join(uploadPath, filename);
    
    // Try different paths
    const possiblePaths = [
      filePath,
      join(process.cwd(), 'uploads', filename),
      join('/app/uploads', filename),
      join('/app', filename),
    ];
    log("possiblePaths", possiblePaths);
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        try {
          const stat = statSync(path);
          // If we got a valid size from disk, use it
          if (stat.size > 0) {
            return stat.size;
          }
          // If file exists but size is 0, and we have fallback, use fallback
          if (stat.size === 0 && fallbackSize && fallbackSize > 0) {
            this.logger.warn(`File ${filename} exists but size is 0, using fallback size: ${fallbackSize} bytes`);
            return fallbackSize;
          }
          return stat.size;
        } catch (error: any) {
          this.logger.warn(`Error getting file size for ${path}: ${error.message}`);
        }
      }
    }
    
    // If file not found, return fallback size if available
    if (fallbackSize && fallbackSize > 0) {
      this.logger.warn(`File ${filename} not found on disk, using fallback size: ${fallbackSize} bytes`);
      return fallbackSize;
    }
    
    return 0;
  }

  async create(createCourseDto: CreateCourseDto, files?: { thumbnail?: Express.Multer.File[], video?: Express.Multer.File[], attachments?: Express.Multer.File[], courseVideos?: Express.Multer.File[] }) {                                                               
    const courseData: any = { ...createCourseDto };
    
    if (files?.thumbnail?.[0]) {
      courseData.thumbnail = files.thumbnail[0].filename;
    }
    
    if (files?.video?.[0]) {
      courseData.videoFile = files.video[0].filename;
    }
    
    if (files?.attachments && files.attachments.length > 0) {
      courseData.attachments = files.attachments.map(file => file.filename);
    }
    
    if (files?.courseVideos && files.courseVideos.length > 0) {
      courseData.courseVideos = files.courseVideos.map(file => file.filename);
    }

    const course = await this.prisma.course.create({
      data: courseData,
    });

    // Log course creation
    this.logger.log(`=== دوره جدید ایجاد شد ===`);
    this.logger.log(`شناسه دوره: ${course.id}`);
    this.logger.log(`عنوان دوره: ${course.title}`);
    this.logger.log(`قیمت: ${course.price}`);
    
    // Log intro video if uploaded
    if (files?.video?.[0]) {
      const introVideoFile = files.video[0];
      const introVideoUrl = this.urlService.getFileUrl(introVideoFile.filename);
      const introVideoStreamUrl = `${this.urlService.getBaseUrl()}/api/courses/${course.id}/intro-video/stream`;
      
      // Get actual file size from disk (with fallback to file.size)
      const fileSize = this.getFileSize(introVideoFile.filename, introVideoFile.size || 0);
      const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
      
      this.logger.log(`--- ویدیو معرفی دوره ---`);
      this.logger.log(`نام فایل: ${introVideoFile.filename}`);
      this.logger.log(`اندازه فایل: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
      this.logger.log(`نوع فایل: ${introVideoFile.mimetype}`);
      this.logger.log(`لینک فایل: ${introVideoUrl}`);
      this.logger.log(`لینک استریم: ${introVideoStreamUrl}`);
    }

    if (files?.courseVideos && files.courseVideos.length > 0) {
      this.logger.log(`--- ویدیوهای دوره (${files.courseVideos.length} عدد) ---`);
      
      for (let i = 0; i < files.courseVideos.length; i++) {
        const videoFile = files.courseVideos[i];
        const video = await this.prisma.video.create({
          data: {
            title: `ویدیو ${i + 1}`,
            description: `ویدیو ${i + 1} از دوره`,
            videoFile: videoFile.filename,
            order: i + 1,
            courseId: course.id,
            published: course.published,
          },
        });
        
        const videoUrl = this.urlService.getFileUrl(videoFile.filename);
        const videoStreamUrl = `${this.urlService.getBaseUrl()}/api/videos/${video.id}/stream`;
        
        // Get actual file size from disk (with fallback to file.size)
        const fileSize = this.getFileSize(videoFile.filename, videoFile.size || 0);
        const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
        
        this.logger.log(`ویدیو ${i + 1}:`);
        this.logger.log(`  - شناسه: ${video.id}`);
        this.logger.log(`  - نام فایل: ${videoFile.filename}`);
        this.logger.log(`  - اندازه: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
        this.logger.log(`  - نوع: ${videoFile.mimetype}`);
        this.logger.log(`  - لینک فایل: ${videoUrl}`);
        this.logger.log(`  - لینک استریم: ${videoStreamUrl}`);
      }
    }

    this.logger.log(`=== پایان لاگ دوره ===\n`);

    return this.urlService.processCourseData(course);
  }

  async findAll() {
    const courses = await this.prisma.course.findMany({
      include: {
        videos: {
          where: { published: true },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.urlService.processCoursesData(courses);
  }

  async findPublished() {
    const courses = await this.prisma.course.findMany({
      where: { published: true },
      include: {
        videos: {
          where: { published: true },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.urlService.processCoursesData(courses);
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        videos: {
          where: { published: true },
          orderBy: { order: 'asc' },
        },
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.urlService.processCourseData(course);
  }

  // Get raw course data without URL processing (for file streaming)
  async findOneRaw(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, files?: { thumbnail?: Express.Multer.File[], video?: Express.Multer.File[], attachments?: Express.Multer.File[], courseVideos?: Express.Multer.File[] }) {
    await this.findOne(id);
    
    const updateData: any = { ...updateCourseDto };
    
    if (files?.thumbnail?.[0]) {
      updateData.thumbnail = files.thumbnail[0].filename;
    }
    
    if (files?.video?.[0]) {
      updateData.videoFile = files.video[0].filename;
    }
    
    if (files?.attachments && files.attachments.length > 0) {
      updateData.attachments = files.attachments.map(file => file.filename);
    }
    
    if (files?.courseVideos && files.courseVideos.length > 0) {
      for (let i = 0; i < files.courseVideos.length; i++) {
        const videoFile = files.courseVideos[i];
        await this.prisma.video.create({
          data: {
            title: `ویدیو ${i + 1}`,
            description: `ویدیو ${i + 1} از دوره`,
            videoFile: videoFile.filename,
            order: i + 1,
            courseId: id,
            published: true,
          },
        });
      }
    }
    
    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: updateData,
    });

    return this.urlService.processCourseData(updatedCourse);
  }

  async remove(id: string) {
    await this.findOne(id);
    
    return this.prisma.course.delete({
      where: { id },
    });
  }

  async uploadThumbnail(id: string, file: Express.Multer.File) {
    await this.findOne(id);
    
    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { thumbnail: file.filename },
    });

    return this.urlService.processCourseData(updatedCourse);
  }

  async uploadIntroVideo(id: string, file: Express.Multer.File) {
    const course = await this.findOne(id);
    
    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { videoFile: file.filename },
    });

    // Log intro video upload
    const introVideoUrl = this.urlService.getFileUrl(file.filename);
    const introVideoStreamUrl = `${this.urlService.getBaseUrl()}/api/courses/${id}/intro-video/stream`;
    
    // Get actual file size from disk
    const fileSize = this.getFileSize(file.filename);
    const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
    
    this.logger.log(`=== آپلود ویدیو معرفی دوره ===`);
    this.logger.log(`شناسه دوره: ${id}`);
    this.logger.log(`عنوان دوره: ${course.title}`);
    this.logger.log(`نام فایل: ${file.filename}`);
    this.logger.log(`اندازه فایل: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
    this.logger.log(`نوع فایل: ${file.mimetype}`);
    this.logger.log(`لینک فایل: ${introVideoUrl}`);
    this.logger.log(`لینک استریم: ${introVideoStreamUrl}`);
    this.logger.log(`=== پایان لاگ ===\n`);

    return this.urlService.processCourseData(updatedCourse);
  }

  async uploadAttachments(id: string, files: Express.Multer.File[]) {
    const course = await this.findOne(id);
    
    const existingAttachments = course.attachments || [];
    const newAttachments = files.map(file => file.filename);
    const allAttachments = [...existingAttachments, ...newAttachments];
    
    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { attachments: allAttachments },
    });

    return this.urlService.processCourseData(updatedCourse);
  }

  async uploadCourseVideos(id: string, files: Express.Multer.File[]) {
    const course = await this.findOne(id);
    
    const existingVideos = course.courseVideos || [];
    const newVideos = files.map(file => file.filename);
    const allVideos = [...existingVideos, ...newVideos];
    
    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { courseVideos: allVideos },
    });

    // Create Video entities for each uploaded course video
    this.logger.log(`=== آپلود ویدیوهای دوره ===`);
    this.logger.log(`شناسه دوره: ${id}`);
    this.logger.log(`عنوان دوره: ${course.title}`);
    this.logger.log(`تعداد ویدیوهای جدید: ${files.length}`);
    
    for (let i = 0; i < files.length; i++) {
      const videoFile = files[i];
      const existingVideoCount = await this.prisma.video.count({
        where: { courseId: id },
      });
      
      const video = await this.prisma.video.create({
        data: {
          title: `ویدیو ${existingVideoCount + i + 1}`,
          description: `ویدیو ${existingVideoCount + i + 1} از دوره`,
          videoFile: videoFile.filename,
          order: existingVideoCount + i + 1,
          courseId: id,
          published: course.published,
        },
      });
      
      const videoUrl = this.urlService.getFileUrl(videoFile.filename);
      const videoStreamUrl = `${this.urlService.getBaseUrl()}/api/videos/${video.id}/stream`;
      
      // Get actual file size from disk
      const fileSize = this.getFileSize(videoFile.filename);
      const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
      
      this.logger.log(`ویدیو ${existingVideoCount + i + 1}:`);
      this.logger.log(`  - شناسه: ${video.id}`);
      this.logger.log(`  - نام فایل: ${videoFile.filename}`);
      this.logger.log(`  - اندازه: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
      this.logger.log(`  - نوع: ${videoFile.mimetype}`);
      this.logger.log(`  - لینک فایل: ${videoUrl}`);
      this.logger.log(`  - لینک استریم: ${videoStreamUrl}`);
    }
    
    this.logger.log(`=== پایان لاگ ===\n`);

    return this.urlService.processCourseData(updatedCourse);
  }

  async uploadCourseAudios(id: string, files: Express.Multer.File[]) {
    const course = await this.findOne(id);
    
    // Create Audio entities for each uploaded course audio
    for (let i = 0; i < files.length; i++) {
      const audioFile = files[i];
      const existingAudioCount = await this.prisma.audio.count({
        where: { courseId: id },
      });
      
      await this.prisma.audio.create({
        data: {
          title: `فایل صوتی ${existingAudioCount + i + 1}`,
          description: `فایل صوتی ${existingAudioCount + i + 1} از دوره`,
          audioFile: audioFile.filename,
          order: existingAudioCount + i + 1,
          courseId: id,
          published: course.published,
        },
      });
    }

    return this.findOne(id);
  }

  async enrollUser(enrollCourseDto: EnrollCourseDto) {
    const { userId, courseId } = enrollCourseDto;

    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('User is already enrolled in this course');
    }

    const enrollment = await this.prisma.courseEnrollment.create({
      data: {
        userId,
        courseId,
      },
    });

    const course = await this.findOne(courseId);
    const videoAccessPromises = course.videos.map(video =>
      this.prisma.videoAccess.create({
        data: {
          userId,
          videoId: video.id,
        },
      }).catch(() => {
      })
    );

    await Promise.all(videoAccessPromises);

    return enrollment;
  }

  async getUserCourses(userId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            videos: {
              where: { published: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return enrollments.map(enrollment => this.urlService.processCourseData(enrollment.course));
  }
}
