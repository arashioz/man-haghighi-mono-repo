import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { join } from 'path';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SalesModule } from './sales/sales.module';
import { SalesTeamsModule } from './sales-teams/sales-teams.module';
import { SlidersModule } from './sliders/sliders.module';
import { ArticlesModule } from './articles/articles.module';
import { PodcastsModule } from './podcasts/podcasts.module';
import { VideoPodcastsModule } from './video-podcasts/video-podcasts.module';
import { CoursesModule } from './courses/courses.module';
import { VideosModule } from './videos/videos.module';
import { AudiosModule } from './audios/audios.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { UploadsModule } from './uploads/uploads.module';
import { UploadCenterModule } from './upload-center/upload-center.module';
import { LogsModule } from './logs/logs.module';
import { AdminModule } from './admin/admin.module';
import { SettingsModule } from './settings/settings.module';
import { HealthController } from './health/health.controller';
import { AppController } from './app.controller';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ProgressiveThrottlerGuard } from './common/guards/progressive-throttler.guard';
import { validateEnv } from './config/env.validation';

@Module({
  controllers: [AppController, HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.production', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: (configService) => ({
        throttlers: [{
          ttl: configService.get('RATE_LIMIT_TTL', 60000),
          limit: configService.get('RATE_LIMIT_MAX', 100),
        }],
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    LogsModule,
    AdminModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    SalesModule,
    SalesTeamsModule,
    SlidersModule,
    ArticlesModule,
    PodcastsModule,
    VideoPodcastsModule,
    CoursesModule,
    VideosModule,
    AudiosModule,
    WorkshopsModule,
    UploadsModule,
    UploadCenterModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ProgressiveThrottlerGuard,
    },
  ],
})
export class AppModule {}
