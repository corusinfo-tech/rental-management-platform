import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { RequestContext } from '../request/request-context';

@Injectable()
export class GlobalResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestContext>();

    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        data,
        meta: {
          correlationId: request.correlationId,
          requestId: request.requestId,
        },
      })),
    );
  }
}
