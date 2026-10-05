import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { zod } from '../common/zod.pipe.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { MAPPERS, MAPPING_KINDS, allowKind, isAdmin } from './shared-kinds.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ImportService } from './import.service.js';

const Rows = z.array(z.record(z.string(), z.unknown())).min(1).max(1000);
const CheckDto = z.object({ rows: Rows, offset: z.number().int().nonnegative() });
const LoadDto = z.object({ rows: Rows, offset: z.number().int().nonnegative(), rows_total: z.number().int().positive(), file_name: z.string().min(1), batch_id: z.number().int().optional() });

/** ADM-04 bulk upload of masters: the Data Administrator only. */
@ApiTags('ADM · bulk upload of masters')
@ApiBearerAuth()
@Roles('admin', ...MAPPERS)
@Controller('admin/import')
export class ImportController {
  constructor(private svc: ImportService) {}

  @Get('kinds') kinds(@CurrentUser() u: AuthUser) { return this.svc.kinds(isAdmin(u) ? undefined : MAPPING_KINDS); }
  @Get('batches') batches() { return this.svc.batches(); }
  @Post(':kind/save') save(@Param('kind') kind: string, @Body(zod(z.object({ row: z.record(z.string(), z.unknown()) }))) b: { row: Record<string, unknown> }, @CurrentUser() u: AuthUser) { return this.svc.save(u, allowKind(u, kind), b.row); }
  @Post(':kind/check') check(@Param('kind') kind: string, @Body(zod(CheckDto)) b: z.infer<typeof CheckDto>, @CurrentUser() u: AuthUser) { return this.svc.check(u, allowKind(u, kind), b.rows, b.offset); }
  @Post(':kind/load') load(@Param('kind') kind: string, @Body(zod(LoadDto)) b: z.infer<typeof LoadDto>, @CurrentUser() u: AuthUser) { return this.svc.load(u, allowKind(u, kind), b); }
}
