import { Module } from '@nestjs/common';
import { VideoPodcastsController } from './video-podcasts.controller';
import { VideoPodcastsService } from './video-podcasts.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [VideoPodcastsController],
  providers: [VideoPodcastsService],
  exports: [VideoPodcastsService],
})
export class VideoPodcastsModule {}




