import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../common/prisma/prisma.service';
import { UrlService } from '../common/services/url.service';

const execAsync = promisify(exec);

@Injectable()
export class AdminService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly urlService: UrlService,
  ) {}

  private readonly backupEntities = [
    'users',
    'courses',
    'videos',
    'audios',
    'podcasts',
    'videoPodcasts',
    'articles',
    'comments',
    'invoices',
    'workshops',
  ] as const;

  async createDatabaseBackup(): Promise<string> {
    try {
      // Get database connection details from environment
      const databaseUrl = this.configService.get<string>('DATABASE_URL');
      
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured');
      }

      // Parse DATABASE_URL safely (handles query params like ?schema=public)
      const parsedUrl = new URL(databaseUrl);
      const user = decodeURIComponent(parsedUrl.username);
      const password = decodeURIComponent(parsedUrl.password);
      const host = parsedUrl.hostname;
      const port = parsedUrl.port || '5432';
      const database = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));
      const schema = parsedUrl.searchParams.get('schema');

      // Create backup directory if it doesn't exist
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                       new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const backupFileName = `haghighi_backup_${timestamp}.sql`;
      const backupPath = path.join(backupDir, backupFileName);

      // Set PGPASSWORD environment variable for pg_dump
      const env = {
        ...process.env,
        PGPASSWORD: password,
      };

      // Create pg_dump command (plain SQL format for easier download and restore)
      const schemaFlag = schema ? ` --schema=${schema}` : '';
      const pgDumpCommand = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database}${schemaFlag} -F p --no-owner --no-acl -f "${backupPath}"`;
      
      // Execute pg_dump
      await execAsync(pgDumpCommand, { env, maxBuffer: 1024 * 1024 * 100 }); // 100MB buffer

      // Check if backup file was created
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file was not created');
      }

      // Return the path to the backup file
      return backupPath;
    } catch (error) {
      console.error('Database backup error:', error);
      throw new HttpException(
        `Failed to create database backup: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private parseEntities(entityParam?: string) {
    const raw = (entityParam || 'all').split(',').map(item => item.trim()).filter(Boolean);

    if (raw.length === 0 || raw.includes('all')) {
      return [...this.backupEntities];
    }

    const invalid = raw.filter(item => !this.backupEntities.includes(item as any));
    if (invalid.length > 0) {
      throw new HttpException(
        `Invalid entities: ${invalid.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return raw as typeof this.backupEntities[number][];
  }

  async createJsonBackup(entityParam?: string): Promise<{ data: Record<string, any>; filename: string }> {
    const entities = this.parseEntities(entityParam);
    const data: Record<string, any> = {};

    for (const entity of entities) {
      switch (entity) {
        case 'users': {
          const users = await this.prisma.user.findMany({
            include: {
              purchasedCourses: {
                include: {
                  course: {
                    include: {
                      videos: { orderBy: { order: 'asc' } },
                      audios: { orderBy: { order: 'asc' } },
                    },
                  },
                },
                orderBy: { enrolledAt: 'desc' },
              },
              videoAccess: true,
              audioAccess: true,
              wallet: true,
              invoices: true,
            },
            orderBy: { createdAt: 'desc' },
          });

          data.users = users.map((user) => {
            const { password, ...rest } = user as any;
            return {
              ...rest,
              purchasedCourses: user.purchasedCourses.map((enrollment) => ({
                ...enrollment,
                course: this.urlService.processCourseData(enrollment.course),
              })),
            };
          });
          break;
        }
        case 'courses': {
          const courses = await this.prisma.course.findMany({
            include: {
              videos: { orderBy: { order: 'asc' } },
              audios: { orderBy: { order: 'asc' } },
              enrollments: true,
            },
            orderBy: { createdAt: 'desc' },
          });
          data.courses = courses.map((course) => this.urlService.processCourseData(course));
          break;
        }
        case 'videos': {
          const videos = await this.prisma.video.findMany({ orderBy: { createdAt: 'desc' } });
          data.videos = videos.map((video) => ({
            ...video,
            videoFile: this.urlService.getFileUrl(video.videoFile),
            thumbnail: this.urlService.getFileUrl(video.thumbnail),
          }));
          break;
        }
        case 'audios': {
          const audios = await this.prisma.audio.findMany({ orderBy: { createdAt: 'desc' } });
          data.audios = audios.map((audio) => ({
            ...audio,
            audioFile: this.urlService.getFileUrl(audio.audioFile),
            thumbnail: this.urlService.getFileUrl(audio.thumbnail),
          }));
          break;
        }
        case 'podcasts': {
          const podcasts = await this.prisma.podcast.findMany({ orderBy: { createdAt: 'desc' } });
          data.podcasts = podcasts.map((podcast) => this.urlService.processPodcastData(podcast));
          break;
        }
        case 'videoPodcasts': {
          const videoPodcasts = await this.prisma.videoPodcast.findMany({ orderBy: { createdAt: 'desc' } });
          data.videoPodcasts = videoPodcasts.map((vp) => this.urlService.processVideoPodcastData(vp));
          break;
        }
        case 'articles': {
          data.articles = await this.prisma.article.findMany({ orderBy: { createdAt: 'desc' } });
          break;
        }
        case 'comments': {
          data.comments = await this.prisma.comment.findMany({ orderBy: { createdAt: 'desc' } });
          break;
        }
        case 'invoices': {
          data.invoices = await this.prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
          break;
        }
        case 'workshops': {
          data.workshops = await this.prisma.workshop.findMany({ orderBy: { createdAt: 'desc' } });
          break;
        }
        default:
          break;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${entities.join('_')}_${timestamp}.json`;

    return { data, filename };
  }
}

