import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { SmsModule } from '../sms/sms.module';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [SmsModule, PrismaModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
