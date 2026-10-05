import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CD_ACCOUNTS, CD_DECIDE, CD_PROPOSE, CD_VIEW, CautionService } from './caution.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const Amount = z.number().positive().max(1_000_000);
const Kind = z.enum(['Hostel', 'Electricity']).default('Hostel');
const ProposeDto = z.object({ kind: Kind, category: z.enum(['Damage', 'Missing_Item', 'Key_Lost', 'Cleaning', 'Fine', 'Other']), amount: Amount,
  reason: z.string().trim().min(10, 'Say what the deduction is for (at least 10 letters)').max(500), handover_id: z.number().int().nullable().optional() });
const OpeningDto = z.object({ kind: Kind, amount: Amount, reason: z.string().trim().min(5).max(300) });
const RefundDto = z.object({ kind: Kind, amount: Amount, mode: z.enum(['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque']), ref: z.string().trim().min(4, 'Enter the bank reference (UTR or cheque number)').max(60),
  account: z.string().trim().max(60).nullable().optional(), reason: z.string().trim().min(5).max(300) });
const DecideDto = z.object({ decision: z.enum(['Approved', 'Rejected']), remarks: z.string().trim().max(300).nullable().optional() });

@ApiTags('CDP · caution deposit')
@ApiBearerAuth()
@Controller()
export class CautionController {
  constructor(private svc: CautionService) {}

  @Roles('Student') @Get('me/caution') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }

  @Roles(...CD_VIEW) @Get('caution/summary') summary(@CurrentUser() u: AuthUser) { return this.svc.summary(u); }
  @Roles(...CD_VIEW) @Get('caution/students') list(@CurrentUser() u: AuthUser, @Query('q') q?: string, @Query('facility_id') f?: string, @Query('show') show?: string) {
    return this.svc.list(u, q || undefined, f || undefined, show || undefined);
  }
  @Roles(...CD_VIEW) @Get('caution/students/:sid') student(@Param('sid') sid: string, @CurrentUser() u: AuthUser) { return this.svc.student(u, sid); }
  @Roles(...CD_PROPOSE) @Post('caution/students/:sid/deductions') propose(@Param('sid') sid: string, @Body(zod(ProposeDto)) b: z.infer<typeof ProposeDto>, @CurrentUser() u: AuthUser) { return this.svc.propose(u, sid, b); }
  @Roles(...CD_DECIDE) @Post('caution/entries/:id/decide') decide(@Param('id', ParseIntPipe) id: number, @Body(zod(DecideDto)) b: z.infer<typeof DecideDto>, @CurrentUser() u: AuthUser) { return this.svc.decide(u, id, b); }
  @Roles(...CD_ACCOUNTS) @Post('caution/students/:sid/opening') opening(@Param('sid') sid: string, @Body(zod(OpeningDto)) b: z.infer<typeof OpeningDto>, @CurrentUser() u: AuthUser) { return this.svc.opening(u, sid, b); }
  @Roles(...CD_ACCOUNTS) @Post('caution/students/:sid/pay-due') payDue(@Param('sid') sid: string, @Body(zod(z.object({ demand_id: z.number().int() }))) b: { demand_id: number }, @CurrentUser() u: AuthUser) { return this.svc.payDue(u, sid, b.demand_id); }
  @Roles(...CD_ACCOUNTS) @Post('caution/students/:sid/refund') refund(@Param('sid') sid: string, @Body(zod(RefundDto)) b: z.infer<typeof RefundDto>, @CurrentUser() u: AuthUser) { return this.svc.refund(u, sid, b); }
}
