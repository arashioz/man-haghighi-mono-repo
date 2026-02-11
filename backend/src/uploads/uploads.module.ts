import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { CloudStorageModule } from '../cloud-storage/cloud-storage.module';

@Module({
  imports:[CloudStorageModule]
,  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
