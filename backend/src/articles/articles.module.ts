import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SeoService } from '../common/services/seo.service';
import { UrlService } from '../common/services/url.service';

@Module({
  imports: [PrismaModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, SeoService, UrlService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
