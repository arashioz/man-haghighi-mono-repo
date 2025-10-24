import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto, EnrollCourseDto } from './dto/course.dto';
import { UrlService } from '../common/services/url.service';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private urlService: UrlService,
  ) {}

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

    if (files?.courseVideos && files.courseVideos.length > 0) {
      for (let i = 0; i < files.courseVideos.length; i++) {
        const videoFile = files.courseVideos[i];
        await this.prisma.video.create({
          data: {
            title: `ویدیو ${i + 1}`,
            description: `ویدیو ${i + 1} از دوره`,
            videoFile: videoFile.filename,
            order: i + 1,
            courseId: course.id,
            published: course.published,
          },
        });
      }
    }

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
