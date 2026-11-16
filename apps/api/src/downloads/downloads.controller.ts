import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { Public, Roles } from '../auth/decorators.js';
import { EXECUTIVES } from '../exec/exec.controller.js';

const FILES = new Set(['KL-Residencies.apk', 'KL-Residencies-demo.apk', 'KL-Dashboard.apk']);
type Req = { headers: Record<string, string | string[] | undefined>; ip?: string };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const deviceOf = (ua: string) => (/iphone|ipad/i.test(ua) ? 'iPhone' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : 'Other');

/** The app download page reports each tap here (no sign-in); the leadership reads the counts. */
@ApiTags('APP · downloads')
@Controller('downloads')
export class DownloadsController {
  constructor(private dbs: DbService) {}

  @Public() @Post() @HttpCode(204)
  async record(@Body() b: { file?: string }, @Req() req: Req) {
    const file = String(b?.file ?? '').replace(/^.*\//, '');
    if (!FILES.has(file)) return;
    const ua = one(req.headers['user-agent']).slice(0, 300);
    const ip = one(req.headers['cf-connecting-ip']) || one(req.headers['x-forwarded-for']).split(',')[0].trim() || req.ip || '';
    const hash = createHash('sha256').update(`${process.env.AUTH_SECRET ?? 'klu'}|${ip}|${ua}`).digest('hex');
    const ref = one(req.headers['referer']).replace(/^https?:\/\/[^/]+/, '').slice(0, 120) || null;
    await this.dbs.rows(sql`insert into shared.app_download (file, device_hash, device, referrer) values (${file}, ${hash}, ${deviceOf(ua)}, ${ref})`);
  }

  @Roles(...EXECUTIVES) @Get('summary')
  async summary() {
    const [total] = await this.dbs.rows(sql`select count(*)::int as taps, count(distinct device_hash)::int as devices, min(downloaded_at) as since from shared.app_download`);
    const byFile = await this.dbs.rows(sql`select file, count(*)::int as taps, count(distinct device_hash)::int as devices from shared.app_download group by 1 order by 2 desc`);
    const byDay = await this.dbs.rows(sql`select downloaded_at::date::text as day, count(*)::int as taps, count(distinct device_hash)::int as devices from shared.app_download group by 1 order by 1`);
    const byDevice = await this.dbs.rows(sql`select coalesce(device, 'Other') as device, count(distinct device_hash)::int as devices from shared.app_download group by 1 order by 2 desc`);
    return { total, by_file: byFile, by_day: byDay, by_device: byDevice };
  }
}
