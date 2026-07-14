import { HttpStatus, RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, type NextFunction, type Response } from 'express';
import { AppModule } from './app.module';
import type { Environment } from './config/environment';
import { GlobalExceptionFilter } from './core/http/global-exception.filter';
import { GlobalResponseInterceptor } from './core/http/global-response.interceptor';
import { AppLogger } from './core/logger/app.logger';
import { CorrelationIdMiddleware } from './core/request/correlation-id.middleware';
import { RequestIdMiddleware } from './core/request/request-id.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  const config = app.get(ConfigService<Environment, true>);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', config.getOrThrow('registration').trustedProxyHops);

  app.useLogger(app.get(AppLogger));
  app.use(app.get(RequestIdMiddleware).use.bind(app.get(RequestIdMiddleware)));
  app.use(app.get(CorrelationIdMiddleware).use.bind(app.get(CorrelationIdMiddleware)));
  app.use(json({ limit: config.getOrThrow('registration').bodyLimitBytes }));
  app.use((error: unknown, request: { correlationId?: string; requestId?: string }, response: Response, next: NextFunction) => {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === HttpStatus.PAYLOAD_TOO_LARGE) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        success: false,
        error: { statusCode: HttpStatus.PAYLOAD_TOO_LARGE, message: 'Request body is too large' },
        meta: { correlationId: request.correlationId, requestId: request.requestId },
      });
      return;
    }
    next(error);
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new GlobalResponseInterceptor());
  app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.ALL }] });
  app.enableVersioning({ type: VersioningType.URI });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NoAgent4U API')
    .setDescription('NoAgent4U platform API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(config.getOrThrow('port'));
}

void bootstrap();
