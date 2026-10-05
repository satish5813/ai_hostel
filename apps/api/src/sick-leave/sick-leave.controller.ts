import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { SickLeaveService } from './sick-leave.service.js';
import { CurrentUser, Roles, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const MESS = ['Mess_Incharge', 'Mess_Manager', 'Mess_Supervisor', 'Catering', 'Cook'];
const VisitDto = z.object({ visit_remarks: z.string().min(3).max(1000), visited_by: z.string().max(20).optional(), visited_at: z.string().datetime({ offset: true }).optional() });
const ApplyDto = z.object({ illness_details: z.string().min(3).max(1000), from_date: z.string().date(), to_date: z.string().date(), medical_doc_id: z.string().uuid().optional(), extended_from_id: z.number().int().optional() });

@ApiTags('F · sick leave')
@ApiBearerAuth()
@Controller()
export class SickLeaveController {
  constructor(private svc: SickLeaveService) {}
  @Post('sick-leaves') apply(@Body(zod(ApplyDto)) b: z.infer<typeof ApplyDto>, @CurrentUser() u: AuthUser) { return this.svc.apply(u, b); }
  @Get('sick-leaves/mine') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Roles(...WARDENS, ...MESS)
  @Get('sick-leaves') list(@Query('facility_id') facility_id: string | undefined, @Query('status') status: string | undefined, @CurrentUser() u: AuthUser) { return this.svc.list({ facility_id, status }, u); }
  @Get('sick-leaves/:id') get(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.get(id, u); }
  @Roles('Chief_Warden', 'Director_Hostels', 'Floor_Warden')
  @Post('sick-leaves/:id/visit') visit(@Param('id', ParseIntPipe) id: number, @Body(zod(VisitDto)) b: z.infer<typeof VisitDto>, @CurrentUser() u: AuthUser) { return this.svc.visit(u, id, b); }
  @Post('sick-leaves/:id/close') close(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ closed_on: z.string().date().optional() }))) b: { closed_on?: string }, @CurrentUser() u: AuthUser) { return this.svc.close(u, id, b.closed_on); }
  @Roles(...MESS, ...WARDENS)
  @Get('mess/sick-list') sickList(@Query('date') date?: string, @Query('facility_id') f?: string) { return this.svc.sickList(date, f); }
  @Roles(...MESS)
  @Post('sick-leaves/:id/deliveries/:date/:slot') delivery(@Param('id', ParseIntPipe) id: number, @Param('date') date: string, @Param('slot') slot: string,
    @Body(zod(z.object({ status: z.enum(['Delivered', 'Not_Required']) }))) b: { status: 'Delivered' | 'Not_Required' }, @CurrentUser() u: AuthUser) {
    return this.svc.delivery(u, id, date, slot, b.status);
  }
}
