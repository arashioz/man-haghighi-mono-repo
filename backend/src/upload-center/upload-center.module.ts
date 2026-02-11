import { Module } from '@nestjs/common';
import { UploadCenterController } from './upload-center.controller';
import { UploadCenterService } from './upload-center.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CloudStorageModule } from '@/cloud-storage/cloud-storage.module';

@Module({
  imports: [PrismaModule,CloudStorageModule],
  controllers: [UploadCenterController],
  providers: [UploadCenterService],
  exports: [UploadCenterService],
})
export class UploadCenterModule {}





