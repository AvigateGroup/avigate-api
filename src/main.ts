// src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { logger } from './utils/logger.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  const apiPrefix = configService.get('API_PREFIX');
  const nodeEnv = configService.get('NODE_ENV');

  app.use(cookieParser());

  // Security
  app.use(helmet());
  app.use(compression());

  // Build allowed origins from environment variables
  const localNetworkIp = configService.get('LOCAL_NETWORK_IP');
  
  const allowedOrigins = [
    configService.get('FRONTEND_URL'),
    configService.get('ADMIN_FRONTEND_URL'),
    configService.get('RAILWAY_APP_URL'),
    configService.get('DEV_MOBILE_URL_1'),
    configService.get('DEV_MOBILE_URL_2'),
    // Development URLs
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    // Add local network IP variants if provided
    ...(localNetworkIp ? [
      `http://${localNetworkIp}:8081`,
      `exp://${localNetworkIp}:8081`,
    ] : []),
  ].filter(Boolean); // Remove undefined values

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or Expo)
      if (!origin) return callback(null, true);

      // In production, check against whitelist
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn(`Blocked by CORS: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
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

  logger.info(`Avigate API is running on: http://localhost:${port}/${apiPrefix}`);
  logger.info(`API Documentation: http://localhost:${port}/api/docs`);
  logger.info(`Environment: ${nodeEnv}`);
}

bootstrap();