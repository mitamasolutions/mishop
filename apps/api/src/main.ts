import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { isTruthyEnv, parseCorsOrigins } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  const docsEnabled = isTruthyEnv(process.env.API_DOCS_ENABLED);
  // CSP solo se desactiva cuando Swagger está habilitado (sus scripts/estilos
  // inline rompen una CSP estricta). Si DOCS están off, helmet aplica CSP por defecto.
  app.use(helmet({ contentSecurityPolicy: docsEnabled ? false : undefined }));
  // cookie-parser habilita lectura de `req.cookies` en el módulo auth para el
  // refresh token HttpOnly (r22 · sprint1_cierre).
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  app.enableCors({
    origin: corsOrigins === true ? true : corsOrigins,
    credentials: true,
  });

  // Las sondas de salud quedan sin versionar (convención de infra).
  app.setGlobalPrefix('v1', { exclude: ['health', 'health/db'] });

  if (docsEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('mitama-commerce API')
      .setDescription('REST API de mitama-commerce: ecommerce + POS para LATAM')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addServer('/v1')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  const docsHint = docsEnabled ? ' — Swagger en /docs' : ' — Swagger deshabilitado (API_DOCS_ENABLED=true para activar)';
  console.log(`API escuchando en http://localhost:${port}${docsHint}`);
}

void bootstrap();
