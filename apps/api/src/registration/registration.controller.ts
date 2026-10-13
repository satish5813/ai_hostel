import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RegistrationService } from './registration.service.js';
import { ACCOUNTS, CurrentUser, OFFICE, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const ApplyDto = z.object({
  student_id: z.string().optional(),
  facility_id: z.string(),
  room_type_id: z.number().int(),
  academic_year: z.string().optional(),
  rules_accepted: z.literal(true, { error: 'The hostel rules must be accepted' }),
});
const DecisionDto = z.object({ decision: z.enum(['Accepted', 'Declined']), decline_reason: z.string().min(3).optional() })
  .refine((d) => d.decision === 'Accepted' || !!d.decline_reason, { message: 'decline_reason is required when declining' });
// the mess choice is a food style (South, North, International) and a diet (Veg, Non_Veg); the old single `cuisine` is still accepted
const FeePlanDto = z.object({ plan_type: z.enum(['Single', 'Two_Instalments']), mess_id: z.number().int().optional(), cuisine: z.enum(['South_Indian', 'North_Indian', 'Veg', 'Non_Veg', 'Jain', 'Special_Diet']).optional(),
  region: z.enum(['South', 'North', 'International']).optional(), diet: z.enum(['Veg', 'Non_Veg']).optional(), country: z.string().trim().max(60).optional() });
const CashReceiptDto = z.object({ amount: z.number().positive(), payment_mode: z.enum(['Cash', 'DD']), reference: z.string().optional() });
const CheckInDto = z.object({ offer_id: z.number().int(), key_no: z.string().min(1), approved_by: z.string().optional() });
const HandoverDto = z.object({
  handover_type: z.enum(['Check_In', 'Check_Out']),
  meter_reading: z.number().nonnegative(),
  key_returned: z.boolean().optional(),
  vacate_id: z.number().int().optional(),
  occupant_acknowledged: z.boolean(),
  lines: z.array(z.object({ asset_id: z.string(), condition: z.enum(['Good', 'Fair', 'Damaged', 'Missing']), damage_amount: z.number().nonnegative().optional(), remarks: z.string().optional() })),
});

@ApiTags('A · registration, allotment, fees, check-in')
@ApiBearerAuth()
@Controller()
export class RegistrationController {
  constructor(private svc: RegistrationService) {}

  @Post('registrations') apply(@Body(zod(ApplyDto)) dto: z.infer<typeof ApplyDto>, @CurrentUser() user: AuthUser) { return this.svc.apply(user, dto); }
  @Get('registrations/mine') mine(@CurrentUser() user: AuthUser) { return this.svc.mine(user); }
  @Roles(...OFFICE, ...ACCOUNTS)
  @Get('registrations') list(@Query('facility_id') facility_id: string | undefined, @Query('status') status: string | undefined, @Query('academic_year') academic_year: string | undefined, @CurrentUser() user: AuthUser) {
    return this.svc.list({ facility_id, status, academic_year }, user);
  }
  @Get('registrations/:id') get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) { return this.svc.get(id, user); }

  @Roles(...OFFICE)
  @Post('registrations/:id/offers') offer(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ subspace_id: z.string().optional() }))) b: { subspace_id?: string }, @CurrentUser() user: AuthUser) {
    return this.svc.offer(user, id, b.subspace_id);
  }
  @Post('offers/:id/decision') decide(@Param('id', ParseIntPipe) id: number, @Body(zod(DecisionDto)) b: z.infer<typeof DecisionDto>, @CurrentUser() user: AuthUser) {
    return this.svc.decide(user, id, b.decision, b.decline_reason);
  }
  @Post('registrations/:id/fee-plan') feePlan(@Param('id', ParseIntPipe) id: number, @Body(zod(FeePlanDto)) b: z.infer<typeof FeePlanDto>, @CurrentUser() user: AuthUser) {
    return this.svc.feePlan(user, id, b);
  }
  @Get('students/:id/demands') demands(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.svc.demands(user, id); }

  @Roles(...ACCOUNTS)
  @Post('demands/:id/receipts') cash(@Param('id', ParseIntPipe) id: number, @Body(zod(CashReceiptDto)) b: z.infer<typeof CashReceiptDto>, @CurrentUser() user: AuthUser) {
    return this.svc.cashReceipt(user, id, b);
  }

  @Roles(...OFFICE)
  @Post('allocations') checkIn(@Body(zod(CheckInDto)) b: z.infer<typeof CheckInDto>, @CurrentUser() user: AuthUser) { return this.svc.checkIn(user, b); }
  @Get('allocations/:id') allocation(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) { return this.svc.allocation(id, user); }
  @Roles(...OFFICE)
  @Post('allocations/:id/handover') handover(@Param('id', ParseIntPipe) id: number, @Body(zod(HandoverDto)) b: z.infer<typeof HandoverDto>, @CurrentUser() user: AuthUser) {
    return this.svc.handover(user, id, b);
  }
}
