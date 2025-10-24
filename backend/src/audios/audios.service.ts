import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAudioDto, UpdateAudioDto, AudioStreamInfo } from './dto/audio.dto';
import { Audio } from '@prisma/client';

@Injectable()
export class AudiosService {
  constructor(private prisma: PrismaService) {}

  async create(createAudioDto: CreateAudioDto): Promise<Audio> {
    const course = await this.prisma.course.findUnique({
      where: { id: createAudioDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const audioCount = await this.prisma.audio.count({
      where: { courseId: createAudioDto.courseId },
    });

    if (audioCount >= 100) {
      throw new BadRequestException('Course cannot have more than 100 audio files');
    }

    return this.prisma.audio.create({
      data: createAudioDto,
    });
  }

  async findAll(): Promise<Audio[]> {
    return this.prisma.audio.findMany({
      include: {
        course: true,
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findByCourse(courseId: string): Promise<Audio[]> {
    return this.prisma.audio.findMany({
      where: { courseId },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOne(id: string): Promise<Audio> {
    const audio = await this.prisma.audio.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!audio) {
      throw new NotFoundException('Audio not found');
    }

    return audio;
  }

  async update(id: string, updateAudioDto: UpdateAudioDto): Promise<Audio> {
    const audio = await this.findOne(id);

    return this.prisma.audio.update({
      where: { id },
      data: updateAudioDto,
    });
  }

  async remove(id: string): Promise<void> {
    const audio = await this.findOne(id);

    await this.prisma.audio.delete({
      where: { id },
    });
  }

  async getAudioStreamUrl(id: string): Promise<AudioStreamInfo> {
    const audio = await this.findOne(id);

    if (!audio.published) {
      throw new BadRequestException('Audio is not published');
    }

    const streamUrl = `${process.env.API_BASE_URL || 'http://194.180.11.193:3000'}/uploads/audios/${audio.audioFile}`;

    return {
      ...audio,
      streamUrl,
    };
  }

  async getMyAudios(userId: string): Promise<Audio[]> {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            audios: {
              where: { published: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    const audios: Audio[] = [];
    enrollments.forEach(enrollment => {
      audios.push(...enrollment.course.audios);
    });

    return audios;
  }

  async grantAccess(userId: string, audioId: string): Promise<void> {
    const audio = await this.findOne(audioId);

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: audio.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new BadRequestException('User is not enrolled in this course');
    }

    await this.prisma.audioAccess.upsert({
      where: {
        userId_audioId: {
          userId,
          audioId,
        },
      },
      create: {
        userId,
        audioId,
      },
      update: {},
    });
  }

  async revokeAccess(userId: string, audioId: string): Promise<void> {
    await this.prisma.audioAccess.deleteMany({
      where: {
        userId,
        audioId,
      },
    });
  }
}
