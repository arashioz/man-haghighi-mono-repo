import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePodcastDto, UpdatePodcastDto } from './dto/podcast.dto';

@Injectable()
export class PodcastsService {
  constructor(private prisma: PrismaService) {}

  async create(createPodcastDto: CreatePodcastDto) {
    return this.prisma.podcast.create({
      data: createPodcastDto,
    });
  }

  async findAll() {
    return this.prisma.podcast.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublished() {
    return this.prisma.podcast.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const podcast = await this.prisma.podcast.findUnique({
      where: { id },
    });

    if (!podcast) {
      throw new NotFoundException('Podcast not found');
    }

    return podcast;
  }

  async update(id: string, updatePodcastDto: UpdatePodcastDto) {
    await this.findOne(id);
    
    return this.prisma.podcast.update({
      where: { id },
      data: updatePodcastDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    
    return this.prisma.podcast.delete({
      where: { id },
    });
  }
}
