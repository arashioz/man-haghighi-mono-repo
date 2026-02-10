import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudStorageService } from './cloud-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CloudStorageService,
      useFactory: (configService: ConfigService) => {
        return new CloudStorageService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [CloudStorageService],
})
export class CloudStorageModule {}


