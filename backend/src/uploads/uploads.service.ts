import { Injectable } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CloudStorageService } from '../cloud-storage/cloud-storage.service';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
  constructor(private readonly cloudStorage: CloudStorageService) {}

  getMulterConfig(): MulterOptions {
    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads');
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|mp4|webm|mov|avi|mp3|wav|pdf|doc|docx|txt)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported file type'), false);
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    };
  }

  async processImage(filePath: string, options?: { width?: number; height?: number; quality?: number }) {
    // For now we don't do server-side image processing; just upload original file to cloud.
    const buffer = await fs.promises.readFile(filePath);
    const filename = filePath.split(/[/\\]/).pop()!;
    const key = `images/${filename}`;
    await this.cloudStorage.uploadObject(key, buffer, 'image/*');
    return key;
  }

  async generateThumbnail(filePath: string) {
    // Simple implementation: we currently reuse original image as thumbnail on cloud
    const filename = filePath.split(/[/\\]/).pop()!;
    const key = `images/${filename}`;
    return key;
  }
}
