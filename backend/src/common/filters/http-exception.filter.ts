import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { LogsService } from '../../logs/logs.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private logsService: LogsService | null = null;

  constructor(private moduleRef: ModuleRef) {
    // Try to get LogsService, but don't fail if it's not available
    try {
      this.logsService = this.moduleRef.get(LogsService, { strict: false });
    } catch {
      this.logsService = null;
    }
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any)?.message || exception.message;
    } else if (exception instanceof Error) {
      if (exception.message.includes('File too large')) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'File size exceeds the allowed limit';
      } else if (exception.message.includes('Unsupported file type') || 
                 (exception.message.includes('Only') && exception.message.includes('files are allowed')) ||
                 exception.message.includes('Only audio files are allowed') ||
                 exception.message.includes('Only video files are allowed') ||
                 exception.message.includes('Only image files are allowed')) {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
      } else if (exception.message.includes('upload')) {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
      } else {
        message = exception.message;
      }
    }

    const isProduction = process.env.NODE_ENV === 'production';
    
    // Log error with stack trace only in development
    const logMessage = `${request.method} ${request.url} - ${status} - ${message}`;
    if (isProduction) {
      this.logger.error(logMessage);
    } else {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Save to database
    if (this.logsService) {
      const userId = (request as any).user?.id;
      const ip = request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
      const userAgent = request.headers['user-agent'];

      this.logsService.createLog({
        level: 'ERROR',
        message: logMessage,
        context: 'HttpExceptionFilter',
        method: request.method,
        url: request.url,
        statusCode: status,
        userId,
        ip: Array.isArray(ip) ? ip[0] : ip,
        userAgent,
        errorStack: exception instanceof Error ? exception.stack : undefined,
        requestBody: request.body,
      }).catch(() => {
        // Silently fail if logging fails
      });
    }

    // Don't expose stack traces in production
    const responseBody: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Only include error details in development
    if (!isProduction && exception instanceof Error) {
      responseBody.error = exception.name;
      if (exception.stack) {
        responseBody.stack = exception.stack;
      }
    }

    // Ensure CORS headers are always set, even on errors
    const origin = request.headers.origin;
    let allowedOrigins: string[] = [];
    
    // Try to get allowed origins from ConfigService or process.env
    try {
      const configService = this.moduleRef.get(ConfigService, { strict: false });
      const corsOriginsEnv = configService?.get<string>('CORS_ORIGINS') || '';
      if (corsOriginsEnv) {
        this.logger.debug(`🔍 CORS_ORIGINS from ConfigService: "${corsOriginsEnv}"`);
        allowedOrigins = corsOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);
      }
    } catch {
      const corsOriginsEnv = process.env.CORS_ORIGINS || '';
      this.logger.debug(`🔍 CORS_ORIGINS from process.env: "${corsOriginsEnv}"`);
      allowedOrigins = corsOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);
    }
    
    // Fallback to defaults if empty
    if (allowedOrigins.length === 0) {
      allowedOrigins = [
        'https://admin.manehaghighi.com',
        'https://manehaghighi.com',
        'https://www.manehaghighi.com',
        'https://api.manehaghighi.com',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
      ];
    }

    if (origin) {
      const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
      
      const isAllowed = allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.replace(/\/$/, '').toLowerCase();
        return normalizedAllowed === normalizedOrigin;
      }) || normalizedOrigin.endsWith('.manehaghighi.com') || normalizedOrigin === 'https://manehaghighi.com';
      
      this.logger.debug(`CORS Check: origin=${origin}, isAllowed=${isAllowed}`);
      
      if (isAllowed) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Range, Accept-Ranges, Content-Range, Access-Control-Allow-Headers, Access-Control-Allow-Origin, Access-Control-Allow-Credentials, Cache-Control, Pragma, Expires, X-HTTP-Method-Override');
        response.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Range, Accept-Ranges, Content-Location');
      } else {
        this.logger.warn(`CORS Check FAILED for origin: ${origin}`);
        this.logger.debug(`Allowed origins: ${allowedOrigins.join(', ')}`);
      }
    }

    response.status(status).json(responseBody);
  }
}
