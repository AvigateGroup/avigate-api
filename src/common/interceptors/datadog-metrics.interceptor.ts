// src/common/interceptors/datadog-metrics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import tracer from 'dd-trace';

@Injectable()
export class DatadogMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const span = tracer.scope().active();

    if (span) {
      span.setTag('http.method', request.method);
      span.setTag('http.url', request.url);
      span.setTag('user.id', request.user?.id);
    }

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          
          // Custom metrics
          tracer.dogstatsd.increment('api.request.count', 1, [
            `method:${request.method}`,
            `endpoint:${request.route?.path || request.url}`,
            'status:success',
          ]);

          tracer.dogstatsd.histogram('api.request.duration', duration, [
            `method:${request.method}`,
            `endpoint:${request.route?.path || request.url}`,
          ]);
        },
        error: (error) => {
          tracer.dogstatsd.increment('api.request.count', 1, [
            `method:${request.method}`,
            `endpoint:${request.route?.path || request.url}`,
            'status:error',
            `error_type:${error.constructor.name}`,
          ]);
        },
      }),
    );
  }
}