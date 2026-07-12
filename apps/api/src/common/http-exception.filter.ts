import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) { const ctx = host.switchToHttp(); const response = ctx.getResponse<Response>(); const request = ctx.getRequest<Request>(); const isHttp = exception instanceof HttpException; const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR; const payload = isHttp ? exception.getResponse() : undefined; const message = typeof payload === 'object' && payload && 'message' in payload ? (payload as { message: unknown }).message : 'Internal server error'; response.status(status).json({ success: false, error: { code: `HTTP_${status}`, message, traceId: request.headers['x-request-id'] } }); }
}
