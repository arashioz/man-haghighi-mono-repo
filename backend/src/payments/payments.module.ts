import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { GatewayService } from './gateway.service';
import { WalletService } from './wallet.service';
import { InvoiceService } from './invoice.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [PrismaModule, CoursesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, GatewayService, WalletService, InvoiceService],
  exports: [PaymentsService, WalletService, InvoiceService],
})
export class PaymentsModule {}

