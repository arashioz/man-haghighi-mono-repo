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
  logger.log(`🔍 CORS_ORIGINS from env: "${corsOriginsEnv}"`);
  const defaultOrigins = [
    'https://admin.manehaghighi.com',
    'https://sales.manehaghighi.com',
    'https://manehaghighi.com',
    'https://www.manehaghighi.com',
    'https://api.manehaghighi.com',
  ];
  let allowedOrigins: string[] = [];
  
  if (corsOriginsEnv) {
    // Parse comma-separated origins from env
    allowedOrigins = corsOriginsEnv.split(',').map(origin => origin.trim()).filter(Boolean);
  }

  // Always include trusted defaults so admin/sales panels don’t break if env is incomplete
  allowedOrigins = Array.from(new Set([...allowedOrigins, ...defaultOrigins]));

  if (allowedOrigins.length === 0) {
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

  // Enable CORS with simplified configuration
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        logger.log('✅ Allowing request with no origin (mobile app or curl)');
        return callback(null, true);
      }

      // Log the incoming origin for debugging
      logger.log(`🔍 CORS request from origin: ${origin}`);

      // Define allowed origins for both production and development
      const allowedOrigins = [
        'https://admin.manehaghighi.com',
        'https://sales.manehaghighi.com',
        'https://manehaghighi.com',
        'https://www.manehaghighi.com',
        'https://api.manehaghighi.com',
        // Local development origins
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
        /\.manehaghighi\.com$/,
      ];

      // Check if origin is allowed
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          const normalizedAllowed = allowed.replace(/\/$/, '').toLowerCase();
          const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
          return normalizedAllowed === normalizedOrigin;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        logger.log(`✅ CORS allowed for origin: ${origin}`);
        callback(null, true);
      } else {
        logger.warn(`🚫 CORS blocked for origin: ${origin}`);
        logger.warn(`📋 Allowed origins: ${allowedOrigins.filter(o => typeof o === 'string').join(', ')}`);
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
      'Range',
      'Content-Range',
      'Accept-Ranges',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
      'Cache-Control',
      'Pragma',
      'Expires',
      'X-HTTP-Method-Override',
    ],
    exposedHeaders: [
      'Content-Length',
      'Content-Type',
      'Content-Range',
      'Accept-Ranges',
      'Content-Location'
    ],
    optionsSuccessStatus: 204,
    maxAge: 86400,
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
