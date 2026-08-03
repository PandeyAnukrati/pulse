import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import express from 'express';
import { join } from 'path';
import { SentryInterceptor } from './prisma/sentry.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Register global interceptors
  app.useGlobalInterceptors(new SentryInterceptor());

  // Serve static assets from uploads directory
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // Allow client requests from web dashboard and canvas
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`[Aether API] listening on: http://localhost:${port}/api`);
}
bootstrap();
