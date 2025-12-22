import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [PrismaModule, SmsModule],
  providers: [MessagesService],
  controllers: [MessagesController],
})
export class MessagesModule {}

