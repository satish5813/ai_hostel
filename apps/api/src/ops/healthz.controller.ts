import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { Public } from '../auth/decorators.js';

/** For the deploy pipeline and monitoring: is the API up, can it reach the database, which version and migration is live. */
@ApiTags('OPS · health')
@Controller()
export class HealthzController {
  constructor(private dbs: DbService) {}

  @Public() @Get('healthz') async healthz() {
    try {
      const [r] = await this.dbs.rows<{ migration: string | null }>(sql`select (select max(file) from public.klu_migration) as migration`);
      return { ok: true, version: process.env.APP_VERSION ?? 'dev', migration: r?.migration ?? null, time: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException('Database not reachable');
    }
  }
}
