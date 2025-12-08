import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UploadedFileInfo, FileType, AssignFileToCourseDto } from './dto/upload-center.dto';
import { join } from 'path';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadCenterService {
  constructor(private prisma: PrismaService) {}

  private getUploadsDirectory(): string {
    return process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
  }

  private getFileType(mimetype: string, filename: string): FileType {
    if (mimetype.startsWith('video/')) {
      return FileType.VIDEO;
    }
    if (mimetype.startsWith('audio/')) {
      return FileType.AUDIO;
    }
    if (mimetype.startsWith('image/')) {
      return FileType.IMAGE;
    }
    if (mimetype.includes('pdf') || mimetype.includes('document') || 
        mimetype.includes('text') || filename.match(/\.(pdf|doc|docx|txt)$/i)) {
      return FileType.DOCUMENT;
    }
    return FileType.OTHER;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  async getAllFiles(): Promise<UploadedFileInfo[]> {
    const uploadsDir = this.getUploadsDirectory();
    
    if (!fs.existsSync(uploadsDir)) {
      return [];
    }

    const files = fs.readdirSync(uploadsDir);
    const fileInfos: UploadedFileInfo[] = [];

    for (const filename of files) {
      const filePath = join(uploadsDir, filename);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        // Get mimetype from file extension
        const ext = path.extname(filename).toLowerCase();
        let mimetype = 'application/octet-stream';
        
        if (ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.avi' || ext === '.mkv') {
          mimetype = 'video/' + ext.substring(1);
        } else if (ext === '.mp3' || ext === '.wav' || ext === '.ogg' || ext === '.m4a' || ext === '.aac') {
          mimetype = 'audio/' + ext.substring(1);
        } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif' || ext === '.webp') {
          mimetype = 'image/' + ext.substring(1);
        } else if (ext === '.pdf') {
          mimetype = 'application/pdf';
        } else if (ext === '.doc' || ext === '.docx') {
          mimetype = 'application/msword';
        } else if (ext === '.txt') {
          mimetype = 'text/plain';
        }

        const fileType = this.getFileType(mimetype, filename);
        const fileInfo: UploadedFileInfo = {
          filename,
          path: `/uploads/${filename}`,
          size: stats.size,
          sizeFormatted: this.formatFileSize(stats.size),
          mimetype,
          type: fileType,
          createdAt: stats.birthtime,
        };

        // Check if file is assigned to a course
        const video = await this.prisma.video.findFirst({
          where: { videoFile: filename },
          include: { course: { select: { id: true, title: true } } },
        });

        if (video) {
          fileInfo.assignedToCourse = {
            courseId: video.courseId,
            courseTitle: video.course.title,
            videoId: video.id,
          };
        } else {
          const audio = await this.prisma.audio.findFirst({
            where: { audioFile: filename },
            include: { course: { select: { id: true, title: true } } },
          });

          if (audio) {
            fileInfo.assignedToCourse = {
              courseId: audio.courseId,
              courseTitle: audio.course.title,
              audioId: audio.id,
            };
          }
        }

        fileInfos.push(fileInfo);
      }
    }

    // Sort by creation date (newest first)
    return fileInfos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getVideos(): Promise<UploadedFileInfo[]> {
    const allFiles = await this.getAllFiles();
    return allFiles.filter(file => file.type === FileType.VIDEO);
  }

  async getAudios(): Promise<UploadedFileInfo[]> {
    const allFiles = await this.getAllFiles();
    return allFiles.filter(file => file.type === FileType.AUDIO);
  }

  async deleteFile(filename: string): Promise<void> {
    const uploadsDir = this.getUploadsDirectory();
    const filePath = join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Check if file is used in database
    const video = await this.prisma.video.findFirst({
      where: { videoFile: filename },
    });

    if (video) {
      throw new BadRequestException('Cannot delete file: it is assigned to a video');
    }

    const audio = await this.prisma.audio.findFirst({
      where: { audioFile: filename },
    });

    if (audio) {
      throw new BadRequestException('Cannot delete file: it is assigned to an audio');
    }

    // Check if used in course thumbnail or videoFile
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [
          { thumbnail: filename },
          { videoFile: filename },
          { courseVideos: { has: filename } },
        ],
      },
    });

    if (course) {
      throw new BadRequestException('Cannot delete file: it is used in a course');
    }

    fs.unlinkSync(filePath);
  }

  async assignFileToCourse(
    filename: string,
    assignDto: AssignFileToCourseDto,
  ): Promise<{ video?: any; audio?: any }> {
    const uploadsDir = this.getUploadsDirectory();
    const filePath = join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: assignDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get file type
    const ext = path.extname(filename).toLowerCase();
    let mimetype = 'application/octet-stream';
    
    if (ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.avi' || ext === '.mkv') {
      mimetype = 'video/' + ext.substring(1);
    } else if (ext === '.mp3' || ext === '.wav' || ext === '.ogg' || ext === '.m4a' || ext === '.aac') {
      mimetype = 'audio/' + ext.substring(1);
    }

    const fileType = this.getFileType(mimetype, filename);

    if (fileType === FileType.VIDEO) {
      // Check if already assigned
      const existingVideo = await this.prisma.video.findFirst({
        where: { videoFile: filename },
      });

      if (existingVideo) {
        throw new BadRequestException('File is already assigned to a video');
      }

      // Count existing videos in course
      const videoCount = await this.prisma.video.count({
        where: { courseId: assignDto.courseId },
      });

      const video = await this.prisma.video.create({
        data: {
          title: assignDto.title || `Video ${videoCount + 1}`,
          description: assignDto.description || '',
          videoFile: filename,
          courseId: assignDto.courseId,
          order: videoCount + 1,
          published: course.published,
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return { video };
    } else if (fileType === FileType.AUDIO) {
      // Check if already assigned
      const existingAudio = await this.prisma.audio.findFirst({
        where: { audioFile: filename },
      });

      if (existingAudio) {
        throw new BadRequestException('File is already assigned to an audio');
      }

      // Count existing audios in course
      const audioCount = await this.prisma.audio.count({
        where: { courseId: assignDto.courseId },
      });

      const audio = await this.prisma.audio.create({
        data: {
          title: assignDto.title || `Audio ${audioCount + 1}`,
          description: assignDto.description || '',
          audioFile: filename,
          courseId: assignDto.courseId,
          order: audioCount + 1,
          published: course.published,
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return { audio };
    } else {
      throw new BadRequestException('File type must be video or audio to assign to course');
    }
  }
}

