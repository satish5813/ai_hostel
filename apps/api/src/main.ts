import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { PgExceptionFilter } from './common/pg-exception.filter.js';
import { corsOrigins, rateLimit, securityHeaders } from './common/hardening.js';

async function bootstrap() {
  // apps/api/.env (not in git) holds DATABASE_URL for the local PostgreSQL; values already set in the environment win
  try { process.loadEnvFile('.env'); } catch { /* no .env: defaults apply */ }
  // without OIDC the caller names itself in headers: never on a server unless the test site is opened to it on purpose
  if (process.env.NODE_ENV === 'production' && !process.env.OIDC_ISSUER && process.env.ALLOW_HEADER_AUTH !== '1') {
    console.error('Refusing to start: NODE_ENV=production needs OIDC_ISSUER (university sign-in). Set ALLOW_HEADER_AUTH=1 only on a closed test server.');
    process.exit(1);
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: { origin: corsOrigins(), credentials: true }, rawBody: true });
  app.use(securityHeaders);
  app.use(rateLimit);
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
