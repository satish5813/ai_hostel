import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { zod } from '../common/zod.pipe.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { MAPPERS, allowKind } from './shared-kinds.js';
import type { AuthUser } from '../auth/auth.types.js';
import { DataService } from './data.service.js';

const split = (all: Record<string, string>) => {
  const { q, sort, dir, page, size, ...rest } = all;
  const filters = Object.fromEntries(Object.entries(rest).filter(([k]) => k.startsWith('f_')).map(([k, v]) => [k.slice(2), v]));
  return { q, sort, dir, page, size, filters };
};

/** ADM-04 data workspace: list, search, filter, sort, page, export and change status of every master. */
@ApiTags('ADM · data workspace')
@ApiBearerAuth()
@Roles('admin', ...MAPPERS)
@Controller('admin/data')
export class DataController {
  constructor(private svc: DataService) {}
  @Get(':kind') list(@Param('kind') kind: string, @Query() q: Record<string, string>, @CurrentUser() u: AuthUser) { return this.svc.list(allowKind(u, kind, true), split(q)); }
  @Get(':kind/export') export(@Param('kind') kind: string, @Query() q: Record<string, string>, @CurrentUser() u: AuthUser) { return this.svc.export(allowKind(u, kind), split(q)); }
  @Post(':kind/:id/status') status(@Param('kind') kind: string, @Param('id') id: string, @Body(zod(z.object({ active: z.boolean() }))) b: { active: boolean }, @CurrentUser() u: AuthUser) {
    return this.svc.setStatus(u, allowKind(u, kind), id, b.active);
  }
}
