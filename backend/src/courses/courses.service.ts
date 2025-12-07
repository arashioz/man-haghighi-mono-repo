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

  async create(createCourseDto: CreateCourseDto, files?: { thumbnail?: Express.Multer.File[], video?: Express.Multer.File[], attachments?: Express.Multer.File[], courseVideos?: Express.Multer.File[], courseAudios?: Express.Multer.File[] }) {                                                               
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
      if (files.courseVideos.length > 50) {
        throw new BadRequestException('حداکثر می‌توانید ۵۰ ویدیو برای هر دوره آپلود کنید');
      }
      courseData.courseVideos = files.courseVideos.map(file => file.filename);
    }

    if (files?.courseAudios && files.courseAudios.length > 50) {
      throw new BadRequestException('حداکثر می‌توانید ۵۰ فایل صوتی برای هر دوره آپلود کنید');
    }

    const course = await this.prisma.course.create({
      data: courseData,
    });

    // Log course creation
    this.logger.log(`=== New Course Created ===`);
    this.logger.log(`Course ID: ${course.id}`);
    this.logger.log(`Course Title: ${course.title}`);
    this.logger.log(`Price: ${course.price}`);
    
    // Log intro video if uploaded
    if (files?.video?.[0]) {
      const introVideoFile = files.video[0];
      const introVideoUrl = this.urlService.getFileUrl(introVideoFile.filename);
      const introVideoStreamUrl = `${this.urlService.getBaseUrl()}/api/courses/${course.id}/intro-video/stream`;
      
      // Get actual file size from disk (with fallback to file.size)
      const fileSize = this.getFileSize(introVideoFile.filename, introVideoFile.size || 0);
      const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
      
      this.logger.log(`--- Course Intro Video ---`);
      this.logger.log(`Filename: ${introVideoFile.filename}`);
      this.logger.log(`File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
      this.logger.log(`File Type: ${introVideoFile.mimetype}`);
      this.logger.log(`File URL: ${introVideoUrl}`);
      this.logger.log(`Stream URL: ${introVideoStreamUrl}`);
    }

           if (files?.courseAudios && files.courseAudios.length > 0) {
             this.logger.log(`--- Course Audios (${files.courseAudios.length} files) ---`);
             
             for (let i = 0; i < files.courseAudios.length; i++) {
               const audioFile = files.courseAudios[i];
               const existingAudioCount = await this.prisma.audio.count({
                 where: { courseId: course.id },
               });
               
               const audio = await this.prisma.audio.create({
                 data: {
                   title: `Audio File ${existingAudioCount + i + 1}`,
                   description: `Audio File ${existingAudioCount + i + 1} of the course`,
                   audioFile: audioFile.filename,
                   order: existingAudioCount + i + 1,
                   courseId: course.id,
                   published: course.published,
                 },
               });
               
               const audioUrl = this.urlService.getFileUrl(audioFile.filename);
               const audioStreamUrl = `${this.urlService.getBaseUrl()}/api/audios/${audio.id}/stream`;
               
               // Get actual file size from disk (with fallback to file.size)
               const fileSize = this.getFileSize(audioFile.filename, audioFile.size || 0);
               const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
               
               this.logger.log(`Audio ${existingAudioCount + i + 1}:`);
               this.logger.log(`  - Audio ID: ${audio.id}`);
               this.logger.log(`  - Filename: ${audioFile.filename}`);
               this.logger.log(`  - File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
               this.logger.log(`  - File Type: ${audioFile.mimetype}`);
               this.logger.log(`  - File URL: ${audioUrl}`);
               this.logger.log(`  - Stream URL: ${audioStreamUrl}`);
             }
           }

           if (files?.courseVideos && files.courseVideos.length > 0) {
             this.logger.log(`--- Course Videos (${files.courseVideos.length} files) ---`);
             
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
        
        this.logger.log(`Video ${i + 1}:`);
        this.logger.log(`  - Video ID: ${video.id}`);
        this.logger.log(`  - Filename: ${videoFile.filename}`);
        this.logger.log(`  - File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
        this.logger.log(`  - File Type: ${videoFile.mimetype}`);
        this.logger.log(`  - File URL: ${videoUrl}`);
        this.logger.log(`  - Stream URL: ${videoStreamUrl}`);
      }
    }

    this.logger.log(`=== End Course Log ===\n`);

    return this.urlService.processCourseData(course);
  }

  async findAll() {
    const courses = await this.prisma.course.findMany({
      include: {
        videos: {
          where: { published: true },
          orderBy: { order: 'asc' },
        },
        audios: {
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
        audios: {
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

  async findForHomepage() {
    const courses = await this.prisma.course.findMany({
      where: { 
        published: true,
        showOnHomepage: true 
      },
      include: {
        videos: {
          where: { published: true },
          orderBy: { order: 'asc' },
        },
        audios: {
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
        audios: {
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

  async update(id: string, updateCourseDto: UpdateCourseDto, files?: { thumbnail?: Express.Multer.File[], video?: Express.Multer.File[], attachments?: Express.Multer.File[], courseVideos?: Express.Multer.File[], courseAudios?: Express.Multer.File[] }) {
    const course = await this.findOne(id);
    
    const updateData: any = { ...updateCourseDto };
    
    if (files?.thumbnail?.[0]) {
      updateData.thumbnail = files.thumbnail[0].filename;
    }
    
    if (files?.video?.[0]) {
      updateData.videoFile = files.video[0].filename;
    }
    
    // Handle attachments: merge existing from DTO with new files
    if (updateCourseDto.attachments && Array.isArray(updateCourseDto.attachments)) {
      // Use attachments from DTO (frontend sends existing attachments to keep)
      updateData.attachments = updateCourseDto.attachments;
    } else if (course.attachments && Array.isArray(course.attachments)) {
      // Keep existing attachments if not specified
      updateData.attachments = course.attachments;
    }
    
    // If new attachment files are uploaded, append them to existing attachments
    if (files?.attachments && files.attachments.length > 0) {
      const newAttachmentFilenames = files.attachments.map(file => file.filename);
      const existingAttachments = updateData.attachments || [];
      updateData.attachments = [...existingAttachments, ...newAttachmentFilenames];
    }
    
    if (files?.courseVideos && files.courseVideos.length > 0) {
      const existingVideoCount = await this.prisma.video.count({
        where: { courseId: id },
      });

      if (existingVideoCount + files.courseVideos.length > 50) {
        throw new BadRequestException('حداکثر تعداد ویدیوهای هر دوره ۵۰ عدد است');
      }
      
      for (let i = 0; i < files.courseVideos.length; i++) {
        const videoFile = files.courseVideos[i];
        await this.prisma.video.create({
          data: {
            title: `Video ${existingVideoCount + i + 1}`,
            description: `Video ${existingVideoCount + i + 1} of the course`,
            videoFile: videoFile.filename,
            order: existingVideoCount + i + 1,
            courseId: id,
            published: true,
          },
        });
      }
    }

    if (files?.courseAudios && files.courseAudios.length > 0) {
      const existingAudioCount = await this.prisma.audio.count({
        where: { courseId: id },
      });

      if (existingAudioCount + files.courseAudios.length > 50) {
        throw new BadRequestException('حداکثر تعداد فایل‌های صوتی هر دوره ۵۰ عدد است');
      }
      
      for (let i = 0; i < files.courseAudios.length; i++) {
        const audioFile = files.courseAudios[i];
        await this.prisma.audio.create({
          data: {
            title: `Audio File ${existingAudioCount + i + 1}`,
            description: `Audio File ${existingAudioCount + i + 1} of the course`,
            audioFile: audioFile.filename,
            order: existingAudioCount + i + 1,
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
    const fileSize = this.getFileSize(file.filename, file.size || 0);
    const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
    
    this.logger.log(`=== Course Intro Video Upload ===`);
    this.logger.log(`Course ID: ${id}`);
    this.logger.log(`Course Title: ${course.title}`);
    this.logger.log(`Filename: ${file.filename}`);
    this.logger.log(`File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
    this.logger.log(`File Type: ${file.mimetype}`);
    this.logger.log(`File URL: ${introVideoUrl}`);
    this.logger.log(`Stream URL: ${introVideoStreamUrl}`);
    this.logger.log(`=== End Log ===\n`);

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
    
    const currentVideoCount = await this.prisma.video.count({
      where: { courseId: id },
    });

    if (currentVideoCount + files.length > 50) {
      throw new BadRequestException('حداکثر تعداد ویدیوهای هر دوره ۵۰ عدد است');
    }

    const existingVideos = course.courseVideos || [];
    const newVideos = files.map(file => file.filename);
    const allVideos = [...existingVideos, ...newVideos].slice(0, 50);
    
    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { courseVideos: allVideos },
    });

    // Create Video entities for each uploaded course video
    this.logger.log(`=== Course Videos Upload ===`);
    this.logger.log(`Course ID: ${id}`);
    this.logger.log(`Course Title: ${course.title}`);
    this.logger.log(`New Videos Count: ${files.length}`);
    
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
      
      // Get actual file size from disk (with fallback to file.size)
      const fileSize = this.getFileSize(videoFile.filename, videoFile.size || 0);
      const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
      
      this.logger.log(`Video ${existingVideoCount + i + 1}:`);
      this.logger.log(`  - Video ID: ${video.id}`);
      this.logger.log(`  - Filename: ${videoFile.filename}`);
      this.logger.log(`  - File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
      this.logger.log(`  - File Type: ${videoFile.mimetype}`);
      this.logger.log(`  - File URL: ${videoUrl}`);
      this.logger.log(`  - Stream URL: ${videoStreamUrl}`);
    }
    
    this.logger.log(`=== End Log ===\n`);

    return this.urlService.processCourseData(updatedCourse);
  }

  /**
   * Upload audio files for a course.
   * NOTE: These audios are stored in the 'audios' table with courseId.
   * They are SEPARATE from standalone podcasts in the 'podcasts' table.
   * Course audios should only be accessed through courses, not through /podcasts endpoints.
   */
  async uploadCourseAudios(id: string, files: Express.Multer.File[]) {
    const course = await this.findOne(id);
    
    this.logger.log(`=== Course Audios Upload ===`);
    this.logger.log(`Course ID: ${id}`);
    this.logger.log(`Course Title: ${course.title}`);
    this.logger.log(`New Audios Count: ${files.length}`);
    
    const currentAudioCount = await this.prisma.audio.count({
      where: { courseId: id },
    });

    if (currentAudioCount + files.length > 50) {
      throw new BadRequestException('حداکثر تعداد فایل‌های صوتی هر دوره ۵۰ عدد است');
    }

    // Create Audio entities for each uploaded course audio
    for (let i = 0; i < files.length; i++) {
      const audioFile = files[i];
      const existingAudioCount = await this.prisma.audio.count({
        where: { courseId: id },
      });
      
      const audio = await this.prisma.audio.create({
        data: {
          title: `Audio File ${existingAudioCount + i + 1}`,
          description: `Audio File ${existingAudioCount + i + 1} of the course`,
          audioFile: audioFile.filename,
          order: existingAudioCount + i + 1,
          courseId: id,
          published: course.published,
        },
      });
      
      const audioUrl = this.urlService.getFileUrl(audioFile.filename);
      const audioStreamUrl = `${this.urlService.getBaseUrl()}/api/audios/${audio.id}/stream`;
      
      // Get actual file size from disk (with fallback to file.size)
      const fileSize = this.getFileSize(audioFile.filename, audioFile.size || 0);
      const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
      
      this.logger.log(`Audio ${existingAudioCount + i + 1}:`);
      this.logger.log(`  - Audio ID: ${audio.id}`);
      this.logger.log(`  - Filename: ${audioFile.filename}`);
      this.logger.log(`  - File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
      this.logger.log(`  - File Type: ${audioFile.mimetype}`);
      this.logger.log(`  - File URL: ${audioUrl}`);
      this.logger.log(`  - Stream URL: ${audioStreamUrl}`);
    }
    
    this.logger.log(`=== End Log ===\n`);

    return this.findOne(id);
  }

  async enrollUser(enrollCourseDto: EnrollCourseDto) {
    const { userId, courseId } = enrollCourseDto;

    // Use upsert to handle race conditions - if enrollment exists, return it; otherwise create it
    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      update: {}, // If exists, just return it without updating
      create: {
        userId,
        courseId,
      },
    });

    // Create video access records (using createMany with skipDuplicates to handle duplicates gracefully)
    const course = await this.findOne(courseId);
    if (course.videos && course.videos.length > 0) {
      const videoAccessData = course.videos.map(video => ({
        userId,
        videoId: video.id,
      }));

      await this.prisma.videoAccess.createMany({
        data: videoAccessData,
        skipDuplicates: true, // Skip if duplicate key constraint is violated
      });
    }

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
            audios: {
              where: { published: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return enrollments.map(enrollment => this.urlService.processCourseData(enrollment.course));
  }

  async getCourseEnrollments(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    return enrollments;
  }

  async getEnrollments(courseId: string) {
    return this.getCourseEnrollments(courseId);
  }

  async transferEnrollments(courseId: string, targetCourseId: string) {
    // Check if both courses exist
    const sourceCourse = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        videos: true,
        audios: true,
      },
    });

    if (!sourceCourse) {
      throw new NotFoundException('Source course not found');
    }

    const targetCourse = await this.prisma.course.findUnique({
      where: { id: targetCourseId },
      include: {
        videos: true,
        audios: true,
      },
    });

    if (!targetCourse) {
      throw new NotFoundException('Target course not found');
    }

    if (courseId === targetCourseId) {
      throw new BadRequestException('Source and target courses cannot be the same');
    }

    // Get all enrollments for the source course
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { courseId },
    });

    if (enrollments.length === 0) {
      return {
        message: 'No enrollments found to transfer',
        transferredCount: 0,
        skippedCount: 0,
      };
    }

    let transferredCount = 0;
    let skippedCount = 0;

    // Transfer each enrollment
    for (const enrollment of enrollments) {
      // Check if user is already enrolled in target course
      const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
        where: {
          userId_courseId: {
            userId: enrollment.userId,
            courseId: targetCourseId,
          },
        },
      });

      if (existingEnrollment) {
        // User already enrolled in target course, skip
        skippedCount++;
        // Delete the source enrollment since user is already in target course
        await this.prisma.courseEnrollment.delete({
          where: { id: enrollment.id },
        });
        // Remove old course video/audio accesses
        await this.removeOldCourseAccesses(enrollment.userId, sourceCourse);
        continue;
      }

      // Update the enrollment to point to target course
      await this.prisma.courseEnrollment.update({
        where: { id: enrollment.id },
        data: { courseId: targetCourseId },
      });

      // Remove old course video/audio accesses
      await this.removeOldCourseAccesses(enrollment.userId, sourceCourse);

      // Grant access to new course videos and audios
      await this.grantCourseAccesses(enrollment.userId, targetCourse);

      transferredCount++;
    }

    return {
      message: `Successfully transferred ${transferredCount} enrollment(s). ${skippedCount} enrollment(s) skipped (users already enrolled in target course).`,
      transferredCount,
      skippedCount,
    };
  }

  private async removeOldCourseAccesses(userId: string, course: any) {
    // Remove video accesses for old course
    if (course.videos && course.videos.length > 0) {
      const videoIds = course.videos.map((v: any) => v.id);
      await this.prisma.videoAccess.deleteMany({
        where: {
          userId,
          videoId: { in: videoIds },
        },
      });
    }

    // Remove audio accesses for old course
    if (course.audios && course.audios.length > 0) {
      const audioIds = course.audios.map((a: any) => a.id);
      await this.prisma.audioAccess.deleteMany({
        where: {
          userId,
          audioId: { in: audioIds },
        },
      });
    }
  }

  private async grantCourseAccesses(userId: string, course: any) {
    // Grant access to all videos in target course
    if (course.videos && course.videos.length > 0) {
      const videoAccessPromises = course.videos.map((video: any) =>
        this.prisma.videoAccess.upsert({
          where: {
            userId_videoId: {
              userId,
              videoId: video.id,
            },
          },
          create: {
            userId,
            videoId: video.id,
          },
          update: {},
        }).catch(() => {
          // Ignore errors if access already exists
        })
      );
      await Promise.all(videoAccessPromises);
    }

    // Grant access to all audios in target course
    if (course.audios && course.audios.length > 0) {
      const audioAccessPromises = course.audios.map((audio: any) =>
        this.prisma.audioAccess.upsert({
          where: {
            userId_audioId: {
              userId,
              audioId: audio.id,
            },
          },
          create: {
            userId,
            audioId: audio.id,
          },
          update: {},
        }).catch(() => {
          // Ignore errors if access already exists
        })
      );
      await Promise.all(audioAccessPromises);
    }
  }

  async getEnrollments(courseId: string) {
    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get enrollments with user information
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    return {
      course: {
        id: course.id,
        title: course.title,
      },
      enrollments,
      total: enrollments.length,
    };
  }
}
