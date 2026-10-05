import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { MeterService } from './meter.service.js';
import { ACCOUNTS, CurrentUser, Roles, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const MAINT = ['Maintenance_Supervisor', 'Electrician', 'Chief_Warden', 'Director_Hostels'];
const MeterDto = z.object({ space_id: z.string(), meter_no: z.string(), meter_type: z.enum(['Smart_Prepaid', 'Manual']), device_ref: z.string().optional(), installed_on: z.string(), asset_id: z.string().optional() });
const ReadingDto = z.object({ reading_kwh: z.number().nonnegative(), reading_at: z.string().optional(), source: z.enum(['Auto', 'Manual']).optional() });
const TariffDto = z.object({ room_type_id: z.number().int(), included_units_per_month: z.number().nonnegative(), rate_per_unit: z.number().positive(), effective_from: z.string() });

@ApiTags('C · electricity meter')
@ApiBearerAuth()
@Controller()
export class MeterController {
  constructor(private svc: MeterService) {}

  @Roles(...MAINT, ...WARDENS, ...ACCOUNTS)
  @Get('meters') list(@Query('facility_id') f?: string) { return this.svc.positions(f); }
  @Get('meters/mine') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Roles(...MAINT)
  @Post('meters') register(@Body(zod(MeterDto)) b: z.infer<typeof MeterDto>, @CurrentUser() u: AuthUser) { return this.svc.register(u, b); }
  @Roles(...MAINT)
  @Post('meters/:id/status') status(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ status: z.enum(['Active', 'Faulty', 'Replaced']) }))) b: { status: 'Active' | 'Faulty' | 'Replaced' }, @CurrentUser() u: AuthUser) {
    return this.svc.setStatus(u, id, b.status);
  }
  @Roles(...MAINT, 'Floor_Warden')
  @Post('meters/:id/readings') reading(@Param('id', ParseIntPipe) id: number, @Body(zod(ReadingDto)) b: z.infer<typeof ReadingDto>, @CurrentUser() u: AuthUser) { return this.svc.reading(u, id, b); }
  @Roles(...MAINT, ...WARDENS, ...ACCOUNTS)
  @Get('meters/:id/readings') readings(@Param('id', ParseIntPipe) id: number) { return this.svc.readings(id); }
  @Roles(...MAINT, ...WARDENS, ...ACCOUNTS)
  @Get('meters/:id/monthly') monthly(@Param('id', ParseIntPipe) id: number) { return this.svc.monthly(id); }
  @Post('meters/:id/recharge') recharge(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ amount: z.number().positive() }))) b: { amount: number }, @CurrentUser() u: AuthUser) {
    return this.svc.recharge(u, id, b.amount);
  }
  @Roles('system', 'Maintenance_Supervisor')
  @Post('recharges/:id/push-result') push(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ push_ref: z.string(), ok: z.boolean() }))) b: { push_ref: string; ok: boolean }, @CurrentUser() u: AuthUser) {
    return this.svc.confirmPush(u, id, b.push_ref, b.ok);
  }
  @Get('tariffs') tariffs() { return this.svc.tariffs(); }
  @Roles(...ACCOUNTS)
  @Post('tariffs') setTariff(@Body(zod(TariffDto)) b: z.infer<typeof TariffDto>, @CurrentUser() u: AuthUser) { return this.svc.setTariff(u, b); }
  /** ELE-03 A: the Pro-VC Finance approves a rate; only approved rates reach the meters. */
  @Roles('Pro_VC_Finance', 'authority')
  @Post('tariffs/:id/approve') approveTariff(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.approveTariff(u, id); }
}
