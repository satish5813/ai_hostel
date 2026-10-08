import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { FloorService } from './floor.service.js';
import { WorkService } from './work.service.js';
import { CurrentUser, Roles, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MARKERS = ['Floor_Warden', 'Warden', 'Assistant_Warden', 'Chief_Warden'];
const SessionDto = z.object({ session_id: z.number().int(), att_date: day, facility_id: z.string(),
  marks: z.array(z.object({ student_id: z.string(), status: z.enum(['Present', 'Absent', 'On_Pass', 'Sick_Leave']), remarks: z.string().max(200).optional() })).min(1).max(1000) });
const RoundDto = z.object({ zone_id: z.string(), date: day,
  lines: z.array(z.object({ place: z.string(), space_id: z.string().nullable().optional(), item_code: z.string(), ok: z.boolean(), note: z.string().max(300).optional() })).min(1).max(2000) });
const TicketDto = z.object({ space_id: z.string(), category_id: z.string(), description: z.string().min(5).max(500), priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional() });

@ApiTags('D · my floor today; H · rounds and tickets')
@ApiBearerAuth()
@Controller()
export class FloorController {
  constructor(private svc: FloorService, private work: WorkService) {}
  @Roles(...WARDENS) @Get('floor/today') today(@CurrentUser() u: AuthUser, @Query('date') d?: string, @Query('facility_id') f?: string) { return this.svc.today(u, d || today(), f || undefined); }

  @Roles(...WARDENS) @Get('attendance/sessions') sessions(@CurrentUser() u: AuthUser, @Query('date') d?: string) { return this.work.sessions(u, d || today()); }
  @Roles(...WARDENS) @Get('attendance/sessions/:id/marks') marks(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser, @Query('date') d?: string) { return this.work.sessionMarks(u, id, d || today()); }
  @Roles(...MARKERS) @Post('attendance/session-mark') mark(@Body(zod(SessionDto)) b: z.infer<typeof SessionDto>, @CurrentUser() u: AuthUser) { return this.work.markSession(u, b); }

  @Roles(...WARDENS) @Get('floor/round') round(@CurrentUser() u: AuthUser, @Query('date') d?: string) { return this.work.round(u, d || today()); }
  @Roles(...MARKERS) @Post('floor/round') saveRound(@Body(zod(RoundDto)) b: z.infer<typeof RoundDto>, @CurrentUser() u: AuthUser) { return this.work.saveRound(u, b); }
  @Roles(...WARDENS) @Get('tickets') tickets(@CurrentUser() u: AuthUser) { return this.work.tickets(u); }
  @Roles(...WARDENS, 'Maintenance_Supervisor', 'Technician') @Get('tickets/categories') categories() { return this.work.categories(); }
  @Roles(...MARKERS) @Post('tickets') raise(@Body(zod(TicketDto)) b: z.infer<typeof TicketDto>, @CurrentUser() u: AuthUser) { return this.work.raise(u, b); }
  @Roles(...MARKERS) @Post('tickets/:id/confirm') confirm(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ fixed: z.boolean(), note: z.string().max(400).optional() }))) b: { fixed: boolean; note?: string }, @CurrentUser() u: AuthUser) { return this.work.confirm(u, id, b); }
  @Roles('Maintenance_Supervisor', 'Technician', 'Chief_Warden') @Post('tickets/:id/resolve') resolve(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ note: z.string().min(3).max(400) }))) b: { note: string }, @CurrentUser() u: AuthUser) { return this.work.resolve(u, id, b.note); }
}
