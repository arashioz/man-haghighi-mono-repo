import { Module } from '@nestjs/common';
import { SalesTeamsService } from './sales-teams.service';
import { SalesTeamsController } from './sales-teams.controller';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [SalesTeamsController],
  providers: [SalesTeamsService, PrismaService],
  exports: [SalesTeamsService],
})
export class SalesTeamsModule {}
