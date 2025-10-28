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

  
  getFileUrl(filePath: string | null | undefined): string | null {
    if (!filePath) {
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

    return {
      ...course,
      thumbnail: this.getFileUrl(course.thumbnail),
      videoFile: this.getFileUrl(course.videoFile),
      attachments: this.getFileUrls(course.attachments),
      courseVideos: this.getFileUrls(course.courseVideos),
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

  
  processCoursesData(courses: any[]): any[] {
    return courses.map(course => this.processCourseData(course));
  }

  
  processSlidersData(sliders: any[]): any[] {
    return sliders.map(slider => this.processSliderData(slider));
  }
}
