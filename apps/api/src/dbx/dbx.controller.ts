import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { DbxService } from './dbx.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const Values = z.record(z.string(), z.unknown());

/** Database explorer: the Data Administrator only. */
@ApiTags('ADM · database explorer')
@ApiBearerAuth()
@Roles('admin')
@Controller('db')
export class DbxController {
  constructor(private svc: DbxService) {}
  @Get('catalog') catalog() { return this.svc.catalog(); }
  @Get('tables/:schema/:table') rows(@Param('schema') s: string, @Param('table') t: string, @Query() q: Record<string, string>) { return this.svc.rows(s, t, q); }
  @Post('tables/:schema/:table/insert') insert(@Param('schema') s: string, @Param('table') t: string, @Body(zod(z.object({ values: Values }))) b: { values: Record<string, unknown> }, @CurrentUser() u: AuthUser) { return this.svc.insert(u, s, t, b.values); }
  @Post('tables/:schema/:table/update') update(@Param('schema') s: string, @Param('table') t: string, @Body(zod(z.object({ key: Values, values: Values }))) b: { key: Record<string, unknown>; values: Record<string, unknown> }, @CurrentUser() u: AuthUser) { return this.svc.update(u, s, t, b.key, b.values); }
  @Post('tables/:schema/:table/delete') remove(@Param('schema') s: string, @Param('table') t: string, @Body(zod(z.object({ key: Values }))) b: { key: Record<string, unknown> }, @CurrentUser() u: AuthUser) { return this.svc.remove(u, s, t, b.key); }
}
