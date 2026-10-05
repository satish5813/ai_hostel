import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { HEALTH_CAPTURE, HEALTH_VIEW, HealthService } from './health.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const ReportDto = z.object({
  student_id: z.string().trim().min(1).max(20), collected_at: z.string().datetime({ offset: true }).or(z.string().date()),
  source: z.enum(['Device', 'Lab', 'Manual', 'Upload']).default('Device'), device_ref: z.string().max(60).nullable().optional(), lab_name: z.string().max(80).nullable().optional(),
  device_notes: z.string().max(4000).nullable().optional(), results: z.record(z.string(), z.union([z.string().max(40), z.number(), z.null()])),
});

@ApiTags('HLT · student health')
@ApiBearerAuth()
@Controller()
export class HealthController {
  constructor(private svc: HealthService) {}
  @Roles(...HEALTH_VIEW, 'Student', 'system') @Get('health/catalogue') catalogue() { return this.svc.catalogue(); }
  /** The equipment (or the Gym Manager) sends one sitting's results; the format is the capture template's test codes. */
  @Roles(...HEALTH_CAPTURE) @Post('health/reports') save(@Body(zod(ReportDto)) b: z.infer<typeof ReportDto>, @CurrentUser() u: AuthUser) { return this.svc.save(u, b); }
  /** An uploaded file: each row is checked on its own, so one bad row is reported and the others are saved. */
  @Roles(...HEALTH_CAPTURE) @Post('health/import') importRows(@Body(zod(z.object({ rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000) }))) b: { rows: Record<string, unknown>[] }, @CurrentUser() u: AuthUser) {
    return this.svc.importRows(u, b.rows.map((r) => { const p = ReportDto.safeParse(r);
      return p.success ? p.data : { student_id: String(r.student_id ?? ''), error: p.error.issues.map((x) => `${x.path.join('.') || 'row'}: ${x.message}`).join('; ') }; }));
  }
  @Roles(...HEALTH_VIEW) @Get('health/students') students(@CurrentUser() u: AuthUser, @Query('q') q?: string, @Query('facility_id') f?: string) { return this.svc.students(u, q || undefined, f || undefined); }
  @Roles(...HEALTH_VIEW) @Get('health/summary') summary(@CurrentUser() u: AuthUser) { return this.svc.summary(u); }
  @Roles(...HEALTH_VIEW) @Get('health/students/:sid/reports') history(@Param('sid') sid: string, @CurrentUser() u: AuthUser) { return this.svc.history(u, sid); }
  @Roles(...HEALTH_VIEW, 'Student') @Get('health/reports/:id') report(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.report(u, id); }
  @Roles('Student') @Get('me/health') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
}
