import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { existsSync, statSync, unlinkSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaService } from '../common/prisma/prisma.service';
import { UrlService } from '../common/services/url.service';
import { CreateVideoPodcastDto, UpdateVideoPodcastDto } from './dto/video-podcast.dto';

const execAsync = promisify(exec);

@Injectable()
export class VideoPodcastsService {
  private readonly logger = new Logger(VideoPodcastsService.name);
  private readonly uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly urlService: UrlService,
  ) {}

  private processVideoPodcast(videoPodcast: any) {
    return this.urlService.processVideoPodcastData(videoPodcast);
  }

  private processVideoPodcasts(videoPodcasts: any[]) {
    return this.urlService.processVideoPodcastsData(videoPodcasts);
  }

  private resolveFilePath(filename: string): string {
    if (!filename) {
      return '';
    }

    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }

    if (filename.startsWith('/')) {
      return filename;
    }

    return join(this.uploadPath, filename);
  }

  private getFileSize(filename: string, fallbackSize?: number): number {
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
        this.logger.log(`Removed video podcast file from disk: ${path}`);
      } catch (error: any) {
        this.logger.warn(`Failed to remove file ${path}: ${error.message}`);
      }
    }
  }

  /**
   * Attempts to extract video duration using ffprobe (if available)
   * Returns duration in seconds, or null if extraction fails
   */
  private async extractVideoDuration(videoPath: string): Promise<number | null> {
    try {
      // Try to use ffprobe to get duration
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );
      const duration = parseFloat(stdout.trim());
      if (!isNaN(duration) && duration > 0) {
        return Math.round(duration);
      }
    } catch (error: any) {
      // ffprobe not available or failed - this is okay, duration can be set manually
      this.logger.debug(`Could not extract duration from video (ffprobe may not be installed): ${error.message}`);
    }
    return null;
  }

  async create(createDto: CreateVideoPodcastDto, video?: Express.Multer.File) {
    const data: any = { ...createDto };

    if (video) {
      data.videoFile = video.filename;
      
      // Try to extract duration automatically if not provided and ffprobe is available
      if (!data.duration) {
        const videoPath = this.resolveFilePath(video.filename);
        if (existsSync(videoPath)) {
          const extractedDuration = await this.extractVideoDuration(videoPath);
          if (extractedDuration) {
            data.duration = extractedDuration;
            this.logger.log(`Auto-extracted duration: ${extractedDuration} seconds`);
          }
        }
      }
    }

    if (!data.videoFile) {
      throw new BadRequestException('Video file upload or video link is required');
    }

    if (data.published && !data.publishedAt) {
      data.publishedAt = new Date().toISOString();
    }

    const created = await this.prisma.videoPodcast.create({
      data,
    });

    if (video) {
      const fileSize = this.getFileSize(video.filename, video.size);
      const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';

      const fileUrl = this.urlService.getFileUrl(video.filename);
      const streamUrl = `${this.urlService.getBaseUrl()}/api/video-podcasts/${created.id}/stream`;

      this.logger.log(`=== New Video Podcast Created ===`);
      this.logger.log(`VideoPodcast ID: ${created.id}`);
      this.logger.log(`Title: ${created.title}`);
      this.logger.log(`Filename: ${video.filename}`);
      this.logger.log(`File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
      this.logger.log(`File Type: ${video.mimetype}`);
      this.logger.log(`Duration: ${created.duration ? `${created.duration} seconds` : 'Not set'}`);
      this.logger.log(`File URL: ${fileUrl}`);
      this.logger.log(`Stream URL: ${streamUrl}`);
      this.logger.log(`=== End Video Podcast Log ===\n`);
    } else if (data.videoFile?.startsWith('http')) {
      this.logger.log(`Video podcast uses external video URL: ${data.videoFile}`);
    }

    return this.processVideoPodcast(created);
  }

  async findAll() {
    const videoPodcasts = await this.prisma.videoPodcast.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return this.processVideoPodcasts(videoPodcasts);
  }

  async findPublished() {
    const videoPodcasts = await this.prisma.videoPodcast.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
    });

    return this.processVideoPodcasts(videoPodcasts);
  }

  async findOne(id: string) {
    const videoPodcast = await this.prisma.videoPodcast.findUnique({
      where: { id },
    });

    if (!videoPodcast) {
      throw new NotFoundException('Video podcast not found');
    }

    return this.processVideoPodcast(videoPodcast);
  }

  async findOneRaw(id: string) {
    const videoPodcast = await this.prisma.videoPodcast.findUnique({
      where: { id },
    });

    if (!videoPodcast) {
      throw new NotFoundException('Video podcast not found');
    }

    return videoPodcast;
  }

  async update(id: string, updateDto: UpdateVideoPodcastDto, video?: Express.Multer.File) {
    const existing = await this.findOneRaw(id);

    const data: any = { ...updateDto };

    if (video) {
      data.videoFile = video.filename;
      
      // Try to extract duration automatically if not provided and ffprobe is available
      if (!data.duration) {
        const videoPath = this.resolveFilePath(video.filename);
        if (existsSync(videoPath)) {
          const extractedDuration = await this.extractVideoDuration(videoPath);
          if (extractedDuration) {
            data.duration = extractedDuration;
            this.logger.log(`Auto-extracted duration: ${extractedDuration} seconds`);
          }
        }
      }
    }

    if (typeof data.published === 'boolean') {
      if (data.published && !data.publishedAt) {
        data.publishedAt = new Date().toISOString();
      }
      if (!data.published) {
        data.publishedAt = null;
      }
    }

    const updated = await this.prisma.videoPodcast.update({
      where: { id },
      data,
    });

    if (video && existing.videoFile !== updated.videoFile) {
      this.removeFileIfLocal(existing.videoFile);
    }

    if (video) {
      const fileSize = this.getFileSize(video.filename, video.size);
      const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : '0.00';
      const fileUrl = this.urlService.getFileUrl(video.filename);
      const streamUrl = `${this.urlService.getBaseUrl()}/api/video-podcasts/${updated.id}/stream`;

      this.logger.log(`=== Video Podcast Updated ===`);
      this.logger.log(`VideoPodcast ID: ${updated.id}`);
      this.logger.log(`Filename: ${video.filename}`);
      this.logger.log(`File Size: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
      this.logger.log(`File Type: ${video.mimetype}`);
      this.logger.log(`Duration: ${updated.duration ? `${updated.duration} seconds` : 'Not set'}`);
      this.logger.log(`File URL: ${fileUrl}`);
      this.logger.log(`Stream URL: ${streamUrl}`);
      this.logger.log(`=== End Video Podcast Log ===\n`);
    }

    return this.processVideoPodcast(updated);
  }

  async remove(id: string) {
    const existing = await this.findOneRaw(id);

    const deleted = await this.prisma.videoPodcast.delete({
      where: { id },
    });

    this.removeFileIfLocal(existing.videoFile);

    return this.processVideoPodcast(deleted);
  }
}




