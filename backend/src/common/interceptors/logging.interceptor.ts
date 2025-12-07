import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { LogsService } from '../../logs/logs.service';

/**
 * Masks sensitive fields in request/response logs
 */
function maskSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'authorization',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
    'creditCard',
    'cvv',
    'ssn',
  ];

  const masked = { ...data };

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***REDACTED***';
    }
  }

  return masked;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly isProduction: boolean;
  private logsService: LogsService | null = null;

  constructor(
    private configService: ConfigService,
    private moduleRef: ModuleRef,
  ) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    // Try to get LogsService, but don't fail if it's not available
    try {
      this.logsService = this.moduleRef.get(LogsService, { strict: false });
    } catch {
      this.logsService = null;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, query, params, headers } = request;
    const startTime = Date.now();

    // Mask sensitive data
    const safeBody = maskSensitiveData(body);
    const safeQuery = maskSensitiveData(query);
    const safeParams = maskSensitiveData(params);
    const safeHeaders = maskSensitiveData(headers);

    // Get user ID if authenticated
    const userId = (request as any).user?.id;

    // Get client IP
    const ip = request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // Log request (OWASP-safe pattern)
    if (!this.isProduction) {
      this.logger.log(
        `${method} ${url} - Query: ${JSON.stringify(safeQuery)} - Params: ${JSON.stringify(safeParams)}`,
      );
    }

    return next.handle().pipe(
      tap({
        next: async () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Log response (OWASP-safe pattern)
          const logMessage = `${method} ${url} ${statusCode} - ${duration}ms`;
          this.logger.log(logMessage);

          // Save to database
          if (this.logsService) {
            this.logsService.createLog({
              level: statusCode >= 400 ? 'ERROR' : 'LOG',
              message: logMessage,
              context: 'HTTP',
              method,
              url,
              statusCode,
              duration,
              userId,
              ip: Array.isArray(ip) ? ip[0] : ip,
              userAgent,
              requestBody: safeBody,
            }).catch(() => {
              // Silently fail if logging fails
            });
          }

          // Log slow requests
          if (duration > 1000) {
            const slowMessage = `Slow request detected: ${method} ${url} took ${duration}ms`;
            this.logger.warn(slowMessage);
            
            if (this.logsService) {
              this.logsService.createLog({
                level: 'WARN',
                message: slowMessage,
                context: 'HTTP',
                method,
                url,
                statusCode,
                duration,
                userId,
                ip: Array.isArray(ip) ? ip[0] : ip,
                userAgent,
              }).catch(() => {
                // Silently fail if logging fails
              });
            }
          }
        },
        error: async (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          const errorMessage = `${method} ${url} ${statusCode} - ${duration}ms - ${error.message}`;
          this.logger.error(errorMessage);

          // Save to database
          if (this.logsService) {
            this.logsService.createLog({
              level: 'ERROR',
              message: errorMessage,
              context: 'HTTP',
              method,
              url,
              statusCode,
              duration,
              userId,
              ip: Array.isArray(ip) ? ip[0] : ip,
              userAgent,
              errorStack: error.stack,
              requestBody: safeBody,
            }).catch(() => {
              // Silently fail if logging fails
            });
          }
        },
      }),
    );
  }
}

