import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { MAINT, MESS, RepairsService, WARDENS } from './repairs.service.js';
import { ElectricityService } from './electricity.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import { assertScope } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

const RaiseDto = z.object({ item_code: z.string().max(20), description: z.string().trim().min(5).max(600), location_note: z.string().max(120).nullable().optional() });
const DESK = [...WARDENS, ...MESS, ...MAINT, 'admin'];
/** Room bills: Accounts, the Chief Warden (own hostels), the office and the Pro-VC Finance. */
const BILLS = ['Accounts_Section', 'Chief_Warden', 'Director_Hostels', 'Room_Allotment', 'Office_Staff', 'Pro_VC_Finance', 'admin'];

@ApiTags('TKT · repairs · ELE · room electricity bills')
@ApiBearerAuth()
@Controller()
export class RepairsController {
  constructor(private svc: RepairsService, private elec: ElectricityService) {}

  @Roles('Student', ...DESK) @Get('repair-items') items() { return this.svc.items(); }
  @Roles('Student') @Get('me/tickets') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Roles('Student') @Post('me/tickets') raise(@Body(zod(RaiseDto)) b: z.infer<typeof RaiseDto>, @CurrentUser() u: AuthUser) { return this.svc.raise(u, b); }
  @Roles('Student') @Post('me/tickets/:id/confirm') confirm(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ fixed: z.boolean(), note: z.string().max(300).nullable().optional() }))) b: { fixed: boolean; note?: string | null }, @CurrentUser() u: AuthUser) {
    return this.svc.confirm(u, id, b);
  }

  @Roles(...DESK) @Get('repair-desk') desk(@CurrentUser() u: AuthUser, @Query('show') show?: string) { return this.svc.desk(u, show === 'all' ? 'all' : 'open'); }
  @Roles(...WARDENS, ...MESS) @Post('repair-desk/:id/verify') verify(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ genuine: z.boolean(), remarks: z.string().max(300).nullable().optional() }))) b: { genuine: boolean; remarks?: string | null }, @CurrentUser() u: AuthUser) {
    return this.svc.verify(u, id, b);
  }
  @Roles(...MAINT, ...MESS, 'Chief_Warden') @Post('repair-desk/:id/start') start(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.start(u, id); }
  @Roles(...MAINT, ...MESS, 'Chief_Warden') @Post('repair-desk/:id/resolve') resolve(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ report: z.string().trim().min(5).max(600), cost: z.number().min(0).nullable().optional() }))) b: { report: string; cost?: number | null }, @CurrentUser() u: AuthUser) {
    return this.svc.resolve(u, id, b);
  }

  @Roles('Student') @Get('me/electricity-bills') myBills(@CurrentUser() u: AuthUser) { return this.elec.mine(u); }
  @Roles(...BILLS) @Get('electricity/bills') bills(@CurrentUser() u: AuthUser, @Query('month') m?: string, @Query('facility_id') f?: string) {
    assertScope(u, f); return this.elec.bills(u, m && /^\d{4}-\d{2}$/.test(m) ? m : undefined, f || undefined);
  }
  @Roles('Accounts_Section', 'admin') @Post('electricity/bills/generate') generate(@Body(zod(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))) b: { month: string }, @CurrentUser() u: AuthUser) {
    return this.elec.generate(u, b.month);
  }
}
