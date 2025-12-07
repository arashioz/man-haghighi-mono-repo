import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePodcastDto, UpdatePodcastDto } from './dto/podcast.dto';
import { UrlService } from '../common/services/url.service';
import { existsSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class PodcastsService {
  private readonly logger = new Logger(PodcastsService.name);
  private readonly uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');

  constructor(
    private prisma: PrismaService,
    private urlService: UrlService,
  ) {}

  private processPodcast(podcast: any) {
    if (!podcast) {
      return podcast;
    }

    return this.urlService.processPodcastData(podcast);
  }

  private processPodcasts(podcasts: any[]) {
    return this.urlService.processPodcastsData(podcasts);
  }

  private resolveFilePath(filename: string): string {
    if (!filename) {
      return '';
    }

    // Reject external URLs - only internal uploads allowed
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      throw new BadRequestException('External URLs are not allowed. Only internal uploads are supported.');
    }

    if (filename.startsWith('/')) {
      return filename;
    }

    return join(this.uploadPath, filename);
  }

  private getFileSize(filename: string, fallbackSize?: number): number {
    // Skip external URLs
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return fallbackSize || 0;
    }

    const possiblePaths = [
      this.resolveFilePath(filename),
      join(process.cwd(), filename),
      join(process.cwd(), 'uploads', filename),
      join('/app/uploads', filename),
      join('/app', filename),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        try {
          const stat = statSync(path);
          if (stat.size > 0) {
            return stat.size;
          }
          if (stat.size === 0 && fallbackSize && fallbackSize > 0) {
            this.logger.warn(`Resolved file ${filename} has size 0, using fallback size ${fallbackSize} bytes`);
            return fallbackSize;
          }
        } catch (error: any) {
          this.logger.warn(`Error getting size for ${path}: ${error.message}`);
        }
      }
    }

    if (fallbackSize && fallbackSize > 0) {
      this.logger.warn(`Could not determine size on disk for ${filename}, using fallback size ${fallbackSize} bytes`);
      return fallbackSize;
    }

    return 0;
  }

  private removeFileIfLocal(filename?: string) {
    if (!filename || filename.startsWith('http://') || filename.startsWith('https://')) {
      return;
    }

    const path = this.resolveFilePath(filename);
    if (existsSync(path)) {
      try {
        unlinkSync(path);
        this.logger.log(`Removed audio file from disk: ${path}`);
      } catch (error: any) {
        this.logger.warn(`Failed to remove file ${path}: ${error.message}`);
      }
    }
  }

  async create(createPodcastDto: CreatePodcastDto, audioFile?: Express.Multer.File, thumbnailFile?: Express.Multer.File) {
    const data: any = { ...createPodcastDto };

    if (audioFile) {
      data.audioFile = audioFile.filename;
    }

    if (thumbnailFile) {
      data.thumbnail = thumbnailFile.filename;
    }

    if (!data.audioFile) {
      throw new BadRequestException('Audio file upload is required. External URLs are not allowed.');
    }

    // Reject external URLs
    if (data.audioFile.startsWith('http://') || data.audioFile.startsWith('https://')) {
      throw new BadRequestException('External URLs are not allowed. Please upload the audio file directly.');
    }

    if (data.published && !data.publishedAt) {
      data.publishedAt = new Date().toISOString();
    }

    const podcast = await this.prisma.podcast.create({
      data,
    });

    this.logger.log(`=== New Podcast Created ===`);
    this.logger.log(`Podcast ID: ${podcast.id}`);
    this.logger.log(`Podcast Title: ${podcast.title}`);

    if (audioFile) {
      const fileSize = this.getFileSize(audioFile.filename, audioFile.size);
      const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';

      const audioUrl = this.urlService.getFileUrl(audioFile.filename);
      const streamUrl = `${this.urlService.getBaseUrl()}/api/podcasts/${podcast.id}/stream`;

      this.logger.log(`--- Podcast Audio ---`);
      this.logger.log(`Filename: ${audioFile.filename}`);
      this.logger.log(`File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
      this.logger.log(`File Type: ${audioFile.mimetype}`);
      this.logger.log(`File URL: ${audioUrl}`);
      this.logger.log(`Stream URL: ${streamUrl}`);
    }
    // External URLs are no longer allowed

    if (thumbnailFile) {
      const thumbnailUrl = this.urlService.getFileUrl(thumbnailFile.filename);
      this.logger.log(`--- Podcast Thumbnail ---`);
      this.logger.log(`Filename: ${thumbnailFile.filename}`);
      this.logger.log(`File Size: ${(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB`);
      this.logger.log(`File Type: ${thumbnailFile.mimetype}`);
      this.logger.log(`Thumbnail URL: ${thumbnailUrl}`);
    }

    this.logger.log(`=== End Podcast Log ===\n`);

    return this.processPodcast(podcast);
  }

  /**
   * Get all standalone podcasts (including unpublished).
   * NOTE: This only returns podcasts from the 'podcasts' table.
   * Course audios (from 'audios' table) are separate and should NOT be included here.
   */
  async findAll() {
    const podcasts = await this.prisma.podcast.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return this.processPodcasts(podcasts);
  }

  /**
   * Get all published standalone podcasts.
   * NOTE: This only returns podcasts from the 'podcasts' table.
   * Course audios (from 'audios' table) are separate and should NOT be included here.
   * Course audios are accessed through courses, not through this endpoint.
   */
  async findPublished() {
    const podcasts = await this.prisma.podcast.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
    });

    return this.processPodcasts(podcasts);
  }

  async findOne(id: string) {
    const podcast = await this.prisma.podcast.findUnique({
      where: { id },
    });

    if (!podcast) {
      throw new NotFoundException('Podcast not found');
    }

    return this.processPodcast(podcast);
  }

  async findOneRaw(id: string) {
    const podcast = await this.prisma.podcast.findUnique({
      where: { id },
    });

    if (!podcast) {
      throw new NotFoundException('Podcast not found');
    }

    return podcast;
  }

  async update(id: string, updatePodcastDto: UpdatePodcastDto, audioFile?: Express.Multer.File, thumbnailFile?: Express.Multer.File) {
    const existing = await this.findOneRaw(id);

    const data: any = { ...updatePodcastDto };

    if (audioFile) {
      data.audioFile = audioFile.filename;
    }

    if (thumbnailFile) {
      data.thumbnail = thumbnailFile.filename;
    }

    if (typeof data.published === 'boolean') {
      if (data.published && !data.publishedAt) {
        data.publishedAt = new Date().toISOString();
      }
      if (!data.published) {
        data.publishedAt = null;
      }
    }

    const updatedPodcast = await this.prisma.podcast.update({
      where: { id },
      data,
    });

    // Remove old audio file if a new one was uploaded
    if (audioFile && existing.audioFile && existing.audioFile !== updatedPodcast.audioFile) {
      this.removeFileIfLocal(existing.audioFile);
    }

    // Remove old thumbnail file if a new one was uploaded
    const existingThumbnail = (existing as any).thumbnail;
    const updatedThumbnail = (updatedPodcast as any).thumbnail;
    if (thumbnailFile && existingThumbnail && existingThumbnail !== updatedThumbnail) {
      this.removeFileIfLocal(existingThumbnail);
    }

    if (audioFile) {
      const fileSize = this.getFileSize(audioFile.filename, audioFile.size);
      const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
      const audioUrl = this.urlService.getFileUrl(audioFile.filename);
      const streamUrl = `${this.urlService.getBaseUrl()}/api/podcasts/${updatedPodcast.id}/stream`;

      this.logger.log(`=== Podcast Audio Updated ===`);
      this.logger.log(`Podcast ID: ${updatedPodcast.id}`);
      this.logger.log(`Filename: ${audioFile.filename}`);
      this.logger.log(`File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
      this.logger.log(`File Type: ${audioFile.mimetype}`);
      this.logger.log(`File URL: ${audioUrl}`);
      this.logger.log(`Stream URL: ${streamUrl}`);
    }

    if (thumbnailFile) {
      const thumbnailUrl = this.urlService.getFileUrl(thumbnailFile.filename);
      this.logger.log(`=== Podcast Thumbnail Updated ===`);
      this.logger.log(`Podcast ID: ${updatedPodcast.id}`);
      this.logger.log(`Filename: ${thumbnailFile.filename}`);
      this.logger.log(`File Size: ${(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB`);
      this.logger.log(`File Type: ${thumbnailFile.mimetype}`);
      this.logger.log(`Thumbnail URL: ${thumbnailUrl}`);
    }

    if (audioFile || thumbnailFile) {
      this.logger.log(`=== End Podcast Log ===\n`);
    }

    return this.processPodcast(updatedPodcast);
  }

  async remove(id: string) {
    const podcast = await this.findOneRaw(id);

    const deleted = await this.prisma.podcast.delete({
      where: { id },
    });

    this.removeFileIfLocal(podcast.audioFile);

    return this.processPodcast(deleted);
  }
}
