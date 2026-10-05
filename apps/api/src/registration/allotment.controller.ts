import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AllotmentService } from './allotment.service.js';
import { CurrentUser, OFFICE, Roles, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const BLOCKERS = ['Chief_Warden', 'Director_Hostels', 'Hostel_Incharge'];
/** level 1 fee verification: the Room Allotment desk (decision D1), and the wardens above it */
const CHECKERS = ['Room_Allotment', 'Office_Staff', 'Chief_Warden', 'Warden', 'Assistant_Warden', 'Hostel_Incharge', 'Director_Hostels'];
const REASON = z.enum(['First_Years', 'Maintenance', 'Staff', 'Visiting_Faculty', 'Management_Quota', 'Sports', 'International', 'Medical', 'Guest', 'Other']);
const BlockDto = z.object({
  space_ids: z.array(z.string().regex(/^[A-Za-z0-9-]{1,30}$/)).min(1).max(200),
  reason: REASON,
  remarks: z.string().max(400).optional(), until_date: z.string().optional(),
}).refine((d) => d.reason !== 'Other' || !!d.remarks, { message: 'Say why the rooms are blocked' });
const FeeCheckDto = z.object({ decision: z.enum(['Verified', 'Query']), remarks: z.string().max(400).optional() });

@ApiTags('A · allotment desk, room blocks, fee check')
@ApiBearerAuth()
@Controller()
export class AllotmentController {
  constructor(private svc: AllotmentService) {}

  @Roles(...OFFICE, 'Accounts_Section') @Get('allotment/hostels') hostels(@CurrentUser() u: AuthUser) { return this.svc.hostels(u); }
  @Roles(...OFFICE, 'Accounts_Section') @Get('allotment/board') board(@Query('facility_id') f: string) { return this.svc.board(f); }
  @Roles(...BLOCKERS) @Post('allotment/blocks') block(@Body(zod(BlockDto)) b: z.infer<typeof BlockDto>, @CurrentUser() u: AuthUser) { return this.svc.block(u, b); }
  @Roles(...BLOCKERS) @Post('allotment/blocks/:id/release') release(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.release(u, id); }
  @Roles('Office_Staff', 'Room_Allotment', 'Chief_Warden', 'Hostel_Incharge') @Post('allotment/auto') auto(@Body(zod(z.object({ facility_id: z.string() }))) b: { facility_id: string }, @CurrentUser() u: AuthUser) { return this.svc.auto(u, b.facility_id); }

  @Get('allotment/catalogue') catalogue(@CurrentUser() u: AuthUser, @Query('year') y?: string) { return this.svc.catalogue(u, y || undefined); }
  @Roles(...WARDENS, 'Office_Staff', 'Room_Allotment', 'Accounts_Section') @Get('allotment/approvals') approvals(@Query('facility_id') f: string | undefined, @CurrentUser() u: AuthUser) { return this.svc.approvals(f || undefined, u); }
  @Roles('Chief_Warden', 'Director_Hostels') @Post('registrations/:id/cw-decision') cw(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ decision: z.enum(['Approved', 'Returned']), remarks: z.string().max(400).optional() }))) b: { decision: 'Approved' | 'Returned'; remarks?: string }, @CurrentUser() u: AuthUser) { return this.svc.cwDecide(u, id, b); }
  @Roles(...BLOCKERS) @Post('allotment/blocks/:id/reason') reason(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ reason: REASON, remarks: z.string().max(400).optional() }))) b: { reason: string; remarks?: string }, @CurrentUser() u: AuthUser) { return this.svc.blockReason(u, id, b.reason, b.remarks); }
  @Get('registrations/:id/choices') choices(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.choices(u, id); }
  @Post('registrations/:id/choose') choose(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ subspace_id: z.string() }))) b: { subspace_id: string }, @CurrentUser() u: AuthUser) { return this.svc.choose(u, id, b.subspace_id); }

  @Roles(...WARDENS, 'Office_Staff', 'Room_Allotment', 'Accounts_Section') @Get('fee-checks') feeChecks(@Query('facility_id') f: string | undefined, @Query('status') s: string | undefined, @CurrentUser() u: AuthUser) { return this.svc.feeChecks(f || undefined, s || 'Pending', u); }
  @Roles(...CHECKERS) @Post('registrations/:id/fee-check') feeCheck(@Param('id', ParseIntPipe) id: number, @Body(zod(FeeCheckDto)) b: z.infer<typeof FeeCheckDto>, @CurrentUser() u: AuthUser) { return this.svc.feeCheck(u, id, b); }
}
