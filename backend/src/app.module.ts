import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_FILTER } from '@nestjs/core';
import { join } from 'path';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SalesModule } from './sales/sales.module';
import { SalesTeamsModule } from './sales-teams/sales-teams.module';
import { SlidersModule } from './sliders/sliders.module';
import { ArticlesModule } from './articles/articles.module';
import { PodcastsModule } from './podcasts/podcasts.module';
import { CoursesModule } from './courses/courses.module';
import { VideosModule } from './videos/videos.module';
import { AudiosModule } from './audios/audios.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthController } from './health/health.controller';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SalesModule,
    SalesTeamsModule,
    SlidersModule,
    ArticlesModule,
    PodcastsModule,
    CoursesModule,
    VideosModule,
    AudiosModule,
    WorkshopsModule,
    UploadsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
