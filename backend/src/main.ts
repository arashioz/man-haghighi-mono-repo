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

  // Get CORS origins from environment variable
  const corsOriginsEnv = configService.get<string>('CORS_ORIGINS', '');
  const defaultOrigins = [
    'https://admin.manehaghighi.com',
    'https://manehaghighi.com',
    'https://www.manehaghighi.com',
  ];
  let allowedOrigins: string[] = [];
  
  if (corsOriginsEnv) {
    // Parse comma-separated origins from env
    allowedOrigins = corsOriginsEnv.split(',').map(origin => origin.trim()).filter(Boolean);
  }

  // Fallback to known safe domains so production admin traffic is not blocked
  if (allowedOrigins.length === 0) {
    allowedOrigins = defaultOrigins;
    if (isProduction) {
      logger.warn('⚠️  CORS_ORIGINS not set; falling back to default admin domains in production.');
    } else {
      logger.log('ℹ️  CORS_ORIGINS not set; using default domains.');
    }
  }

  // Validate no wildcards
  if (allowedOrigins.length > 0 && allowedOrigins.some(origin => origin.includes('*'))) {
    throw new Error('CORS origins cannot contain wildcards. Use specific origins only.');
  }

  logger.log(`✅ CORS enabled for ${allowedOrigins.length} origin(s)`);

  // Enable CORS first (before helmet)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is allowed
      const isAllowed = allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.replace(/\/$/, '').toLowerCase();
        const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
        
        // Exact match
        if (normalizedAllowed === normalizedOrigin) return true;
        
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`🚫 CORS blocked for origin: ${origin}`);
        logger.debug(`Allowed origins: ${allowedOrigins.join(', ')}`);
        // We still call callback(null, false) so the browser handles it, 
        // but it won't have the Access-Control-Allow-Origin header
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'Origin', 
      'X-Requested-With',
      'Range', // Important for video streaming
      'Content-Range',
      'Accept-Ranges',
      'Access-Control-Allow-Headers'
    ],
    exposedHeaders: [
      'Content-Length', 
      'Content-Type',
      'Content-Range', // Important for video streaming
      'Accept-Ranges', // Important for video streaming
      'Content-Location'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Cache preflight requests for 24 hours
  });

  app.use(require('express').json({ limit: '10gb' }));
  app.use(require('express').urlencoded({ limit: '10gb', extended: true }));

  // Apply helmet with proper security configuration
  // CSP temporarily disabled to allow app access
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled temporarily
    crossOriginEmbedderPolicy: false, // Disabled for video streaming compatibility
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Required for video streaming
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
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

  // Serve static uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    fallthrough: true,
  });

  const port = configService.get<number>('PORT', 3000);
  
  logger.log('🔧 Configuring middleware and routes...');
  logger.log('📊 Setting up Swagger documentation...');
  logger.log('🔒 Security middleware configured');
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`🔐 CORS origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'none'}`);
  
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
