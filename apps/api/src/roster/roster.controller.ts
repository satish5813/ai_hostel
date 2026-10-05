import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RosterService } from './roster.service.js';
import { CurrentUser, Roles, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const EDITORS = ['Chief_Warden', 'Warden', 'Assistant_Warden', 'Hostel_Incharge', 'Housekeeping_Supervisor', 'Director_Hostels'];
const VIEWERS = [...WARDENS, 'Housekeeping_Supervisor', 'Office_Staff', 'Security_Officer', 'Security_Guard', 'Dean_Students_Affairs'];
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MarkDto = z.object({ facility_id: z.string(), date: day, marks: z.array(z.object({ staff_id: z.string(), status: z.enum(['Present', 'Absent', 'Leave', 'Half_Day', 'Week_Off']), remarks: z.string().max(200).optional() })).min(1).max(500) });
const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

@ApiTags('B · staff attendance and duty roster')
@ApiBearerAuth()
@Controller()
export class RosterController {
  constructor(private svc: RosterService) {}
  @Roles(...VIEWERS) @Get('roster') day(@Query('facility_id') f: string, @Query('date') d?: string) { return this.svc.day(f, d || today()); }
  @Roles(...VIEWERS) @Get('roster/week') week(@Query('facility_id') f: string, @Query('from') d?: string) { return this.svc.week(f, d || today()); }
  @Roles(...EDITORS, 'Floor_Warden', 'Security_Officer') @Post('roster/attendance') mark(@Body(zod(MarkDto)) b: z.infer<typeof MarkDto>, @CurrentUser() u: AuthUser) { return this.svc.mark(u, b); }
  @Roles(...EDITORS) @Post('roster/generate') generate(@Body(zod(z.object({ facility_id: z.string(), date: day }))) b: { facility_id: string; date: string }, @CurrentUser() u: AuthUser) { return this.svc.generate(u, b.facility_id, b.date); }
  @Roles(...EDITORS) @Post('roster/duties/:id') set(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ staff_id: z.string().nullable() }))) b: { staff_id: string | null }, @CurrentUser() u: AuthUser) { return this.svc.setDuty(u, id, b.staff_id); }
  @Roles(...VIEWERS, 'admin') @Get('mapping/summary') summary() { return this.svc.summary(); }
}
