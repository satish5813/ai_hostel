import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { DeanService } from './dean.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const DEAN = ['Dean_Students_Affairs', 'Dean_Students_Progression'];
const CW = ['Chief_Warden', 'Director_Hostels'];
const INCIDENT = z.enum(['Ragging', 'Violence', 'Substance', 'Curfew_Violation', 'Property_Damage', 'Misconduct', 'Other']);
const RecordDto = z.object({ student_id: z.string().min(1).max(20), incident_on: z.string().datetime({ offset: true }), incident_type: INCIDENT, description: z.string().min(10).max(2000), student_statement: z.string().max(2000).nullable().optional() });
const InquiryDto = z.object({ student_statement: z.string().max(2000).nullable().optional(), cw_findings: z.string().max(2000).nullable().optional(), cw_recommendation: z.string().max(1000).nullable().optional(), send: z.boolean().optional() });
const DecideDto = z.object({
  outcome: z.enum(['Punish', 'No_Action', 'Return']), decision: z.string().min(5).max(2000),
  punishment: z.object({ punishment_type: z.enum(['Warning', 'Fine', 'Outing_Ban', 'Hostel_Suspension', 'Expulsion', 'Community_Service']), from_date: z.string().date().nullable().optional(),
    to_date: z.string().date().nullable().optional(), fine_amount: z.number().positive().max(100000).nullable().optional(), bars_outings: z.boolean().optional(), details: z.string().max(1000).nullable().optional() }).optional(),
});

@ApiTags('DSA · Dean, Students Affairs')
@ApiBearerAuth()
@Controller()
export class DeanController {
  constructor(private svc: DeanService) {}
  @Roles(...DEAN, ...CW) @Get('dean/overview') overview(@CurrentUser() u: AuthUser, @Query('weeks') w?: string) { return this.svc.overview(u, Number(w) || 8); }
  @Roles(...DEAN, ...CW) @Get('dean/absence') absence(@CurrentUser() u: AuthUser, @Query('days') d?: string, @Query('facility_id') f?: string) { return this.svc.absence(u, Number(d) || 30, f || undefined); }
  @Roles(...DEAN) @Get('dean/careers') careers(@CurrentUser() u: AuthUser, @Query('programme') p?: string, @Query('facility_id') f?: string) { return this.svc.careers(u, p || 'CSE', f || undefined); }

  @Roles(...DEAN, ...CW) @Get('weekly-reports') weekly(@CurrentUser() u: AuthUser, @Query('facility_id') f?: string) { return this.svc.weekly(u, f || undefined); }
  @Roles(...DEAN, ...CW) @Get('weekly-reports/:id') weeklyOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.weeklyOne(u, id); }
  @Roles(...CW) @Post('weekly-reports/build') build(@Body(zod(z.object({ week: z.string().date().optional() }))) b: { week?: string }, @CurrentUser() u: AuthUser) { return this.svc.buildWeekly(u, b.week); }
  @Roles(...CW) @Post('weekly-reports/:id/send') send(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ remarks: z.string().max(2000).nullable().optional() }))) b: { remarks?: string | null }, @CurrentUser() u: AuthUser) {
    return this.svc.sendWeekly(u, id, b.remarks?.trim() || null);
  }

  @Roles(...DEAN, ...CW) @Get('discipline') cases(@CurrentUser() u: AuthUser, @Query('status') s?: string, @Query('facility_id') f?: string) { return this.svc.cases(u, s || undefined, f || undefined); }
  @Roles(...CW) @Get('discipline/residents') residents(@CurrentUser() u: AuthUser, @Query('q') q?: string) { return this.svc.residents(u, q ?? ''); }
  @Roles(...CW) @Post('discipline') record(@Body(zod(RecordDto)) b: z.infer<typeof RecordDto>, @CurrentUser() u: AuthUser) { return this.svc.record(u, b); }
  @Roles(...CW) @Put('discipline/:id') inquire(@Param('id', ParseIntPipe) id: number, @Body(zod(InquiryDto)) b: z.infer<typeof InquiryDto>, @CurrentUser() u: AuthUser) { return this.svc.inquire(u, id, b); }
  @Roles('Dean_Students_Affairs') @Post('discipline/:id/decide') decide(@Param('id', ParseIntPipe) id: number, @Body(zod(DecideDto)) b: z.infer<typeof DecideDto>, @CurrentUser() u: AuthUser) { return this.svc.decide(u, id, b); }

  @Roles('Student') @Get('me/career-goal') goal(@CurrentUser() u: AuthUser) { return this.svc.myGoal(u); }
  @Roles('Student') @Post('me/career-goal') setGoal(@Body(zod(z.object({ goal: z.enum(['Placement_Product', 'Placement_Services', 'Higher_Studies', 'Govt_Exams', 'Entrepreneurship', 'Core_Other', 'Undecided']), notes: z.string().max(300).nullable().optional() }))) b: { goal: string; notes?: string | null }, @CurrentUser() u: AuthUser) {
    return this.svc.setGoal(u, b);
  }
}
