import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateVideoDto, UpdateVideoDto } from './dto/video.dto';
import { UrlService } from '../common/services/url.service';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    private urlService: UrlService,
  ) {}

  async create(createVideoDto: CreateVideoDto) {
    return this.prisma.video.create({
      data: createVideoDto,
    });
  }

  async findAll() {
    const videos = await this.prisma.video.findMany({
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return videos.map(video => ({
      ...video,
      thumbnail: this.urlService.getFileUrl(video.thumbnail),
      videoFile: this.urlService.getFileUrl(video.videoFile),
    }));
  }

  async findByCourse(courseId: string) {
    const videos = await this.prisma.video.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });

    return videos.map(video => ({
      ...video,
      thumbnail: this.urlService.getFileUrl(video.thumbnail),
      videoFile: this.urlService.getFileUrl(video.videoFile),
    }));
  }

  async findOne(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return {
      ...video,
      thumbnail: this.urlService.getFileUrl(video.thumbnail),
      videoFile: this.urlService.getFileUrl(video.videoFile),
    };
  }

  async update(id: string, updateVideoDto: UpdateVideoDto) {
    await this.findOne(id);
    
    return this.prisma.video.update({
      where: { id },
      data: updateVideoDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    
    return this.prisma.video.delete({
      where: { id },
    });
  }

  async checkVideoAccess(userId: string, videoId: string): Promise<boolean> {
    const videoAccess = await this.prisma.videoAccess.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });

    if (videoAccess) {
      return true;
    }

    const video = await this.findOne(videoId);
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: video.courseId,
        },
      },
    });

    return !!enrollment;
  }

  async getUserAccessibleVideos(userId: string) {
    const enrolledCourses = await this.prisma.courseEnrollment.findMany({
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

    const directAccess = await this.prisma.videoAccess.findMany({
      where: { userId },
      include: {
        video: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const allVideos = new Map();

    enrolledCourses.forEach(enrollment => {
      enrollment.course.videos.forEach(video => {
        allVideos.set(video.id, {
          ...video,
          accessType: 'course_enrollment',
        });
      });
    });

    directAccess.forEach(access => {
      if (access.video && access.video.published) {
        allVideos.set(access.video.id, {
          ...access.video,
          accessType: 'direct_access',
        });
      }
    });

    return Array.from(allVideos.values());
  }
}
