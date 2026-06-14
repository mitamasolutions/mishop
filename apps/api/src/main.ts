import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // CSP desactivado: rompe Swagger UI en /docs (carga scripts/estilos inline).
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  // Las sondas de salud quedan sin versionar (convención de infra).
  app.setGlobalPrefix('v1', { exclude: ['health', 'health/db'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('mitama-commerce API')
    .setDescription('REST API de mitama-commerce: ecommerce + POS para LATAM')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addServer('/v1')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`API escuchando en http://localhost:${port} — Swagger en /docs`);
}

void bootstrap();
