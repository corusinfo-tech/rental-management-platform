"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const express_1 = require("express");
const app_module_1 = require("./app.module");
const global_exception_filter_1 = require("./core/http/global-exception.filter");
const global_response_interceptor_1 = require("./core/http/global-response.interceptor");
const app_logger_1 = require("./core/logger/app.logger");
const correlation_id_middleware_1 = require("./core/request/correlation-id.middleware");
const request_id_middleware_1 = require("./core/request/request-id.middleware");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true, bodyParser: false });
    const config = app.get((config_1.ConfigService));
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', config.getOrThrow('registration').trustedProxyHops);
    app.useLogger(app.get(app_logger_1.AppLogger));
    app.use(app.get(request_id_middleware_1.RequestIdMiddleware).use.bind(app.get(request_id_middleware_1.RequestIdMiddleware)));
    app.use(app.get(correlation_id_middleware_1.CorrelationIdMiddleware).use.bind(app.get(correlation_id_middleware_1.CorrelationIdMiddleware)));
    app.use((0, express_1.json)({ limit: config.getOrThrow('registration').bodyLimitBytes }));
    app.use((error, request, response, next) => {
        if (typeof error === 'object' && error !== null && 'status' in error && error.status === common_1.HttpStatus.PAYLOAD_TOO_LARGE) {
            response.status(common_1.HttpStatus.PAYLOAD_TOO_LARGE).json({
                success: false,
                error: { statusCode: common_1.HttpStatus.PAYLOAD_TOO_LARGE, message: 'Request body is too large' },
                meta: { correlationId: request.correlationId, requestId: request.requestId },
            });
            return;
        }
        next(error);
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    app.useGlobalInterceptors(new global_response_interceptor_1.GlobalResponseInterceptor());
    app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: common_1.RequestMethod.ALL }] });
    app.enableVersioning({ type: common_1.VersioningType.URI });
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('NoAgent4U API')
        .setDescription('NoAgent4U platform API')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
        .build();
    swagger_1.SwaggerModule.setup('docs', app, swagger_1.SwaggerModule.createDocument(app, swaggerConfig));
    await app.listen(config.getOrThrow('port'));
}
void bootstrap();
