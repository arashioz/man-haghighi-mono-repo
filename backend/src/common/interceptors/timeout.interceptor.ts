import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Skip timeout for large uploads (multipart/form-data) and known heavy routes
    const contentType = request.headers['content-type'] as string | undefined;
    const isMultipart = contentType?.includes('multipart/form-data');
    const path: string = request?.route?.path || request?.url || '';
    if (isMultipart || path.includes('/uploads') || path.includes('/courses')) {
      return next.handle();
    }

    const timeoutMs = this.configService.get<number>('REQUEST_TIMEOUT', 30000);

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request timeout'));
        }
        return throwError(() => err);
      }),
    );
  }
}

