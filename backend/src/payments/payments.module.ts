import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagesModule } from '../messages/messages.module';
import { CoursesModule } from '../courses/courses.module';
import { WorkshopsModule } from '../workshops/workshops.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { GatewayService } from './gateway.service';
import { WalletService } from './wallet.service';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [
    ConfigModule,
    MessagesModule,
    CoursesModule,
    WorkshopsModule,
    PrismaModule
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    GatewayService,
    WalletService,
    InvoiceService
  ],
  exports: [PaymentsService]
})
export class PaymentsModule {}
