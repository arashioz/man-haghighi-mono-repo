import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudStorageService } from '../cloud-storage/cloud-storage.service';
import { UploadedFileInfo, FileType, AssignFileToCourseDto } from './dto/upload-center.dto';
import { join } from 'path';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadCenterService {
  constructor(
    private prisma: PrismaService,
    private cloudStorage: CloudStorageService,
  ) {}

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
    const fileInfos: UploadedFileInfo[] = [];

    // در نسخه کلاد: منبع اصلی اطلاعات فایل‌ها دیتابیس است (video / audio / course / podcast / ...)
    const [videos, audios] = await Promise.all([
      this.prisma.video.findMany({
        where: { videoFile: { not: null } },
        select: { id: true, title: true, description: true, videoFile: true, createdAt: true, courseId: true, course: { select: { id: true, title: true } } },
      }),
      this.prisma.audio.findMany({
        where: { audioFile: { not: null } },
        select: { id: true, title: true, description: true, audioFile: true, createdAt: true, courseId: true, course: { select: { id: true, title: true } } },
      }),
    ]);

    // Videos
    for (const video of videos) {
      const filename = video.videoFile as string;
      const ext = path.extname(filename).toLowerCase();
      let mimetype = 'video/mp4';
      if (ext) {
        mimetype = `video/${ext.substring(1)}`;
      }
      const fileType = this.getFileType(mimetype, filename);
      const size = 0; // Unknown without HEAD to cloud; نمایش فقط منطقی

      const fileInfo: UploadedFileInfo = {
        filename,
        path: filename,
        size,
        sizeFormatted: this.formatFileSize(size),
        mimetype,
        type: fileType,
        createdAt: video.createdAt,
        assignedToCourse: video.courseId
          ? {
              courseId: video.courseId,
              courseTitle: video.course?.title || '',
              videoId: video.id,
            }
          : undefined,
      };

      fileInfos.push(fileInfo);
    }

    // Audios
    for (const audio of audios) {
      const filename = audio.audioFile as string;
      const ext = path.extname(filename).toLowerCase();
      let mimetype = 'audio/mpeg';
      if (ext) {
        mimetype = `audio/${ext.substring(1)}`;
      }
      const fileType = this.getFileType(mimetype, filename);
      const size = 0;

      const fileInfo: UploadedFileInfo = {
        filename,
        path: filename,
        size,
        sizeFormatted: this.formatFileSize(size),
        mimetype,
        type: fileType,
        createdAt: audio.createdAt,
        assignedToCourse: audio.courseId
          ? {
              courseId: audio.courseId,
              courseTitle: audio.course?.title || '',
              audioId: audio.id,
            }
          : undefined,
      };

      fileInfos.push(fileInfo);
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

  async deleteFile(filename: string, force: boolean = false): Promise<void> {
    // در حالت کلاد، فایل فیزیکی روی دیسک نداریم؛ فقط رکوردها و آبجکت روی کلاد را مدیریت می‌کنیم
    // If force delete, remove from database first
    if (force) {
      // Delete video if exists
      const video = await this.prisma.video.findFirst({
        where: { videoFile: filename },
      });
      if (video) {
        await this.prisma.video.delete({ where: { id: video.id } });
      }

      // Delete audio if exists
      const audio = await this.prisma.audio.findFirst({
        where: { audioFile: filename },
      });
      if (audio) {
        await this.prisma.audio.delete({ where: { id: audio.id } });
      }

      // Remove from course thumbnail or videoFile
      await this.prisma.course.updateMany({
        where: {
          OR: [
            { thumbnail: filename },
            { videoFile: filename },
          ],
        },
        data: {
          thumbnail: null,
          videoFile: null,
        },
      });

      // Remove from courseVideos array (if it's an array field)
      const coursesWithFile = await this.prisma.course.findMany({
        where: {
          courseVideos: { has: filename },
        },
      });
      for (const course of coursesWithFile) {
        const updatedVideos = (course.courseVideos as string[] || []).filter(v => v !== filename);
        await this.prisma.course.update({
          where: { id: course.id },
          data: { courseVideos: updatedVideos },
        });
      }
    } else {
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
    }

    // Delete file from cloud (videos/ یا audios/)
    const videoKey = `videos/${filename}`;
    const audioKey = `audios/${filename}`;
    await this.cloudStorage.deleteObject(videoKey);
    await this.cloudStorage.deleteObject(audioKey);
  }

  async assignFileToCourse(
    filename: string,
    assignDto: AssignFileToCourseDto,
    forceReassign: boolean = false,
  ): Promise<{ video?: any; audio?: any }> {
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
        if (forceReassign) {
          // Update existing video
          const video = await this.prisma.video.update({
            where: { id: existingVideo.id },
            data: {
              title: assignDto.title || existingVideo.title,
              description: assignDto.description !== undefined ? assignDto.description : existingVideo.description,
              courseId: assignDto.courseId,
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
        } else {
          throw new BadRequestException('File is already assigned to a video. Use forceReassign to change assignment.');
        }
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
        if (forceReassign) {
          // Update existing audio
          const audio = await this.prisma.audio.update({
            where: { id: existingAudio.id },
            data: {
              title: assignDto.title || existingAudio.title,
              description: assignDto.description !== undefined ? assignDto.description : existingAudio.description,
              courseId: assignDto.courseId,
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
          throw new BadRequestException('File is already assigned to an audio. Use forceReassign to change assignment.');
        }
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



