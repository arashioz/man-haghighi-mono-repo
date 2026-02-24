import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { Request, Response } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  logger.log('🚀 Starting Haghighi Platform API...');
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
    rawBody: true,
    logger: process.env.NODE_ENV === 'production' 
      ? ['log', 'error', 'warn'] 
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  // Disable x-powered-by header
  app.disable('x-powered-by');



  const allowedOrigins = [
    'https://manehaghighi.com',
    'https://www.manehaghighi.com',
    'https://admin.manehaghighi.com',
    'https://sales.manehaghighi.com',
    'https://api.manehaghighi.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
  ];

  // CORS با Nest داخلی تا روی همهٔ پاسخ‌ها (از جمله 400/401 لاگین) هدر بیاید و فرانت از manehaghighi.com خطا نگیرد
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, '').toLowerCase();
      const allowed = allowedOrigins.some((o) => o.replace(/\/$/, '').toLowerCase() === normalized);
      const allowedPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
      if (allowed || allowedPattern.test(normalized) || normalized.includes('manehaghighi.com')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Range',
      'Accept-Ranges',
      'Content-Range',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Range', 'Accept-Ranges'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };
  app.enableCors(corsOptions);

  // آپلود تا ۲۰ گیگ — nginx هم باید client_max_body_size 20G و proxy timeouts بالا داشته باشد
  app.use(require('express').json({ limit: '20gb' }));
  app.use(require('express').urlencoded({ limit: '20gb', extended: true }));

  // Apply helmet with proper security configuration
  // CSP temporarily disabled to allow app access
  // crossOriginResourcePolicy: cross-origin تا عکس/مدیا از API روی فرانت (دامنه دیگر) لود شود
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(compression());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    forbidUnknownValues: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Handle root path before setting global prefix
  app.getHttpAdapter().get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Haghighi Platform API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        docs: '/api/docs',
        health: '/api/health',
        api: '/api',
      },
    });
  });

  // Set global prefix for all routes (after CORS setup)
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Haghighi Platform API')
    .setDescription('Complete platform API with NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Serve static uploads — هدر CORP برای لود عکس/صدا از دامنهٔ دیگر (مثلاً پنل ادمین)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    fallthrough: true,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  const port = configService.get<number>('PORT', 3000);
  
  logger.log('🔧 Configuring middleware and routes...');
  logger.log('📊 Setting up Swagger documentation...');
  logger.log('🔒 Security middleware configured');
  logger.log(`🌍 Environment: ${nodeEnv}`);
  
  await app.listen(port);
  
  const serverIp = configService.get<string>('SERVER_IP', 'localhost');
  logger.log(`✅ Application is running on: http://${serverIp}:${port}`)
  logger.log(`📚 Swagger docs available at: http://${serverIp}:${port}/api/docs`)
  logger.log(`📁 Static files served from: /uploads/`);
  logger.log('🎉 Haghighi Platform API is ready!');
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Failed to start application:', error);
  process.exit(1);
});
