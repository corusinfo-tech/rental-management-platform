import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestContext } from './request-context';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: RequestContext, response: Response, next: NextFunction): void {
    const correlationId = request.header('x-correlation-id') || request.requestId;

    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId ?? '');
    next();
  }
}
