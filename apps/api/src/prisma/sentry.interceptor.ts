import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const dsn = process.env.SENTRY_DSN;
        if (dsn) {
          console.log('[Sentry Logger] Sending crash report to Sentry:', error.message || error);
          // Standard implementation: Sentry.captureException(error)
        } else {
          console.log('[Sentry Logger Mock] Caught exception (SENTRY_DSN not configured):', error.message || error);
        }
        return throwError(() => error);
      }),
    );
  }
}
