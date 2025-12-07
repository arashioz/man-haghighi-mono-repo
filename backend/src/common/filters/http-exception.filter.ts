import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

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
    if (isProduction) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );
    } else {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
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

    response.status(status).json(responseBody);
  }
}
