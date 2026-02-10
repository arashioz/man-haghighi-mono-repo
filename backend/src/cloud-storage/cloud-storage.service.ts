import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';

@Injectable()
export class CloudStorageService {
  private readonly logger = new Logger(CloudStorageService.name);
  private readonly client: MinioClient;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get<string>('CLOUD_ENDPOINT', 'c445737.parspack.net');
    const accessKey = this.configService.get<string>('CLOUD_ACCESS_KEY');
    const secretKey = this.configService.get<string>('CLOUD_SECRET_KEY');
    const useSSL = this.configService.get<string>('CLOUD_USE_SSL', 'true') === 'true';
    const port = this.configService.get<number | undefined>('CLOUD_PORT') || undefined;
    this.bucket = this.configService.get<string>('CLOUD_BUCKET', 'c445737');

    this.client = new MinioClient({
      endPoint,
      useSSL,
      accessKey,
      secretKey,
      port,
    });

    // For public bucket without custom domain, Parspack MinIO usually serves as:
    // https://<endpoint>/<bucket>/<objectName>
    const protocol = useSSL ? 'https' : 'http';
    this.publicBaseUrl = `${protocol}://${endPoint}/${this.bucket}`;
  }

  /**
   * Uploads an object from a buffer and returns the object key.
   */
  async uploadObject(
    key: string,
    data: Buffer,
    contentType?: string,
  ): Promise<string> {
    this.logger.log(`Uploading object to cloud storage: key=${key}, bucket=${this.bucket}`);
    await this.client.putObject(
      this.bucket,
      key,
      data,
      data.length,
      contentType ? { 'Content-Type': contentType } : undefined,
    );
    return key;
  }

  /**
   * Deletes an object if it exists. Does not throw if missing.
   */
  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
    } catch (error) {
      this.logger.warn(`Failed to delete object ${key}: ${error.message}`);
    }
  }

  /**
   * Returns a public URL for the object assuming bucket is public.
   */
  getPublicUrl(key: string): string {
    // If already a full URL, return as is
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    return `${this.publicBaseUrl}/${encodeURI(key)}`;
  }
}


