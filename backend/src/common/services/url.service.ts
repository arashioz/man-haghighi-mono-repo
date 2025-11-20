import { Injectable } from '@nestjs/common';

@Injectable()
export class UrlService {
  private readonly baseUrl: string;

  constructor() {
    // Prefer explicit API_BASE_URL, otherwise build from current server
    // Ensure no trailing slash
    const rawBase = process.env.API_BASE_URL || this.buildDefaultUrl();
    this.baseUrl = rawBase.replace(/\/$/, '');
  }

  private buildDefaultUrl(): string {
    // Get server IP from environment or use localhost
    const serverIp = process.env.SERVER_IP || '194.180.11.193';
    
    // Get port from environment (backend port exposed to outside)
    // For docker-compose-alt-ports.yml: backend is on 8080
    const port = process.env.EXTERNAL_PORT || process.env.PORT || '3000';
    
    return `http://${serverIp}:${port}`;
  }

  
  getBaseUrl(): string {
    return this.baseUrl;
  }

  
  getFileUrl(filePath: string | null | undefined): string | null {
    if (!filePath) {
      return null;
    }
    
    // Filter out placeholder service URLs that may not resolve
    if (filePath.includes('via.placeholder.com') || 
        filePath.includes('placeholder.com') ||
        filePath.includes('dummyimage.com') ||
        filePath.startsWith('FFFFFF')) {
      return null;
    }
    
    if (filePath.startsWith('http://') || filePath.startsWith('https://')){
      return filePath;
    }
    
    if (filePath.startsWith('/uploads/')) {
      return `${this.baseUrl}${filePath}`;
    }
    
    return `${this.baseUrl}/uploads/${filePath}`;
  }

  
  getFileUrls(filePaths: string[] | null | undefined): string[] {
    if (!filePaths || !Array.isArray(filePaths)) {
      return [];
    }
    
    return filePaths.map(path => this.getFileUrl(path)).filter(Boolean) as string[];
  }

  
  processCourseData(course: any): any {
    if (!course) return course;

    const attachmentFiles = Array.isArray(course.attachments) ? [...course.attachments] : [];
    const courseVideoFiles = Array.isArray(course.courseVideos) ? [...course.courseVideos] : [];

    return {
      ...course,
      thumbnail: this.getFileUrl(course.thumbnail),
      videoFile: this.getFileUrl(course.videoFile),
      attachments: this.getFileUrls(attachmentFiles),
      courseVideos: this.getFileUrls(courseVideoFiles),
      attachmentFiles,
      courseVideoFiles,
      videos: course.videos?.map((video: any) => ({
        ...video,
        thumbnail: this.getFileUrl(video.thumbnail),
        videoFile: this.getFileUrl(video.videoFile),
      })) || [],
    };
  }

  
  processSliderData(slider: any): any {
    if (!slider) return slider;

    return {
      ...slider,
      image: this.getFileUrl(slider.image),
      videoFile: this.getFileUrl(slider.videoFile),
    };
  }

  processPodcastData(podcast: any): any {
    if (!podcast) return podcast;

    const streamUrl = podcast.id
      ? `${this.baseUrl}/api/podcasts/${podcast.id}/stream`
      : null;

    return {
      ...podcast,
      audioFile: this.getFileUrl(podcast.audioFile),
      streamUrl,
    };
  }

  processPodcastsData(podcasts: any[]): any[] {
    return podcasts.map((podcast) => this.processPodcastData(podcast));
  }

  processVideoPodcastData(videoPodcast: any): any {
    if (!videoPodcast) return videoPodcast;

    const streamUrl = videoPodcast.id
      ? `${this.baseUrl}/api/video-podcasts/${videoPodcast.id}/stream`
      : null;

    return {
      ...videoPodcast,
      videoFile: this.getFileUrl(videoPodcast.videoFile),
      thumbnail: this.getFileUrl(videoPodcast.thumbnail),
      streamUrl,
    };
  }

  processVideoPodcastsData(videoPodcasts: any[]): any[] {
    return videoPodcasts.map((videoPodcast) => this.processVideoPodcastData(videoPodcast));
  }

  processCoursesData(courses: any[]): any[] {
    return courses.map(course => this.processCourseData(course));
  }

  
  processSlidersData(sliders: any[]): any[] {
    return sliders.map(slider => this.processSliderData(slider));
  }
}
