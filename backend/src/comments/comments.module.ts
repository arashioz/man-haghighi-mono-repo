import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AdminCommentsController, CommentsController } from './comments.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommentsController, AdminCommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}


