import { Module } from '@nestjs/common';
import { WorkshopsController } from './workshops.controller';
import { WorkshopsService } from './workshops.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [WorkshopsController],
  providers: [WorkshopsService],
  exports: [WorkshopsService],
})
export class WorkshopsModule {}
