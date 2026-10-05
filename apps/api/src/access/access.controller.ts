import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AccessService } from './access.service.js';
import { CurrentUser, Roles, SECURITY, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const SETTERS = ['Chief_Warden', 'Director_Hostels', 'Security_Officer'];
const METHOD = z.enum(['Manual', 'QR', 'Face', 'Thumb', 'Card']);
const PolicyDto = z.object({ who: z.enum(['Everyone', 'All_Hostellers', 'Own_Hostel', 'Own_Floor', 'Staff_Only']), open_from: z.string().nullable().optional(), open_to: z.string().nullable().optional(),
  outside_hours: z.enum(['Deny', 'Need_Approval', 'Allow_And_Alert']), pass_to_exit: z.boolean(), proof: z.array(METHOD).min(1), approver_role: z.string().nullable().optional(), photo_on_entry: z.boolean(), methods: z.array(METHOD).min(1) });
const ScanDto = z.object({ student_id: z.string(), point_id: z.number().int(), direction: z.enum(['In', 'Out']), method: METHOD, match_confidence: z.number().min(0).max(100).optional(), reason: z.string().max(200).optional(), at: z.string().optional() });

@ApiTags('D · access control for every space')
@ApiBearerAuth()
@Controller('access')
export class AccessController {
  constructor(private svc: AccessService) {}
  @Roles(...SECURITY, 'Director_Hostels') @Get('points') points() { return this.svc.points(); }
  @Roles(...SETTERS) @Post('points/:id/policy') policy(@Param('id', ParseIntPipe) id: number, @Body(zod(PolicyDto)) b: z.infer<typeof PolicyDto>, @CurrentUser() u: AuthUser) { return this.svc.setPolicy(u, id, b as never); }
  @Roles(...SECURITY, 'Director_Hostels') @Post('check') check(@Body(zod(ScanDto)) b: z.infer<typeof ScanDto>) { return this.svc.check(b.student_id, b.point_id, b.direction, b.method, b.at); }
  @Roles(...SECURITY, 'system') @Post('scan') scan(@Body(zod(ScanDto)) b: z.infer<typeof ScanDto>, @CurrentUser() u: AuthUser) { return this.svc.scan(u, b); }
  @Roles(...WARDENS, 'Security_Officer') @Get('requests') requests(@CurrentUser() u: AuthUser, @Query('all') all?: string) { return this.svc.requests(u, all === '1'); }
  @Roles(...WARDENS, 'Security_Officer') @Post('requests/:id/decide') decide(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ approve: z.boolean(), remarks: z.string().max(300).optional() }))) b: { approve: boolean; remarks?: string }, @CurrentUser() u: AuthUser) { return this.svc.decide(u, id, b.approve, b.remarks); }
  @Roles(...SECURITY, 'Director_Hostels') @Get('log') log(@Query('point_id') p?: string) { return this.svc.log(p ? Number(p) : undefined); }
  @Roles(...SETTERS, 'Warden') @Get('enrolment') enrolment(@Query('facility_id') f?: string) { return this.svc.enrolment(f || undefined); }
  @Roles('Security_Officer', 'Chief_Warden') @Post('enrol') enrol(@Body(zod(z.object({ student_id: z.string(), method: z.enum(['Face', 'Thumb', 'Card']), template_ref: z.string().min(3).max(120) }))) b: { student_id: string; method: string; template_ref: string }, @CurrentUser() u: AuthUser) { return this.svc.enrol(u, b); }
}
