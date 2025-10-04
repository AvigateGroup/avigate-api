// src/main.ts

import { initializeDatadog } from './config/datadog.config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { logger } from './utils/logger.util';
import { initializeSentry } from './config/sentry.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';

initializeDatadog();
initializeSentry(app);
  app.useGlobalFilters(new SentryExceptionFilter());

  // Security
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: [
      configService.get('FRONTEND_URL'),
      configService.get('ADMIN_FRONTEND_URL'),
    ],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Avigate API')
    .setDescription("Nigeria's Smart Local Transportation Navigation System API")
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('admin', 'Admin endpoints')
    .addTag('locations', 'Location management endpoints')
    .addTag('routes', 'Route management endpoints')
    .addTag('fares', 'Fare management endpoints')
    .addTag('community', 'Community features endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  
  logger.info(`🚀 Avigate API is running on: http://localhost:${port}/${apiPrefix}`);
  logger.info(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();