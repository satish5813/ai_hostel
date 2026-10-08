import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { PgExceptionFilter } from './common/pg-exception.filter.js';

async function bootstrap() {
  // apps/api/.env (not in git) holds DATABASE_URL for the local PostgreSQL; values already set in the environment win
  try { process.loadEnvFile('.env'); } catch { /* no .env: defaults apply */ }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: { origin: true, credentials: true }, rawBody: true });
  app.useBodyParser('json', { limit: '8mb' });   // bulk uploads of masters arrive as chunks of rows
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new PgExceptionFilter());

  const doc = new DocumentBuilder()
    .setTitle('KL University Hostel ERP API')
    .setDescription('Workflows A–F: registration & fees, people-to-rooms, electricity meter, student tracking, outing permission, sick leave')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api  (docs at /docs)`);
}
await bootstrap();
