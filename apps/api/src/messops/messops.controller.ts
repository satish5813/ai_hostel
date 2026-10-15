import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { MESS_HEADS, MESS_STAFF, MESS_VIEW, MessOpsService } from './messops.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const Meal = z.enum(['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner']);
const Day = z.string().date();
const GrievanceDto = z.object({ meal_date: Day, slot: Meal, aspect: z.enum(['Quality', 'Quantity', 'Both']), details: z.string().trim().min(10, 'Say what was wrong (at least 10 letters)').max(600), rating: z.number().int().min(1).max(5).nullable().optional() });
const ReplyDto = z.object({ action_taken: z.string().trim().min(5).max(600), close: z.boolean().default(false) });
const RaiseDto = z.object({ mess_id: z.number().int(), meal_date: Day, slot: Meal, action_summary: z.string().trim().max(600).nullable().optional() });
const ScanDto = z.object({ mess_id: z.number().int(), meal: Meal, student_id: z.string().trim().min(3).max(20) });
const ReceiptDto = z.object({ mess_id: z.number().int(), received_on: Day, supplier: z.string().trim().min(2).max(120), bill_no: z.string().trim().max(40).nullable().optional(),
  lines: z.array(z.object({ sku: z.string().max(30), qty: z.number().positive(), rate: z.number().nonnegative(), expiry_date: Day.nullable().optional() })).min(1).max(60) });
const IssueDto = z.object({ mess_id: z.number().int(), issue_date: Day, meal: Meal, student_strength: z.number().int().nonnegative().nullable().optional(), remarks: z.string().max(300).nullable().optional(),
  lines: z.array(z.object({ sku: z.string().max(30), qty: z.number().positive() })).min(1).max(60) });
const DailyDto = z.object({ mess_id: z.number().int(), record_date: Day, meals: z.array(z.object({ meal: Meal, meals_planned: z.number().nonnegative(), meals_served: z.number().nonnegative().nullable().optional(),
  prep_wastage_kg: z.number().nonnegative(), plate_wastage_kg: z.number().nonnegative(), menu_followed: z.boolean(), deviation_reason: z.string().max(300).nullable().optional() })).min(1).max(4) });

@ApiTags('G · rasoi operations')
@ApiBearerAuth()
@Controller()
export class MessOpsController {
  constructor(private svc: MessOpsService) {}

  @Roles(...MESS_VIEW) @Get('mess-ops/messes') messes() { return this.svc.messes(); }

  @Roles('Student') @Get('me/mess-grievances') mine(@CurrentUser() u: AuthUser) { return this.svc.myGrievances(u); }
  @Roles('Student') @Post('me/mess-grievances') raiseMine(@Body(zod(GrievanceDto)) b: z.infer<typeof GrievanceDto>, @CurrentUser() u: AuthUser) { return this.svc.raiseGrievance(u, b); }
  @Roles(...MESS_VIEW) @Get('mess-ops/grievances') grievances(@Query('mess_id', ParseIntPipe) m: number, @Query('status') s?: string) { return this.svc.grievances(m, s || undefined); }
  @Roles(...MESS_HEADS, 'Chief_Warden', 'Director_Hostels') @Post('mess-ops/grievances/:id/reply') reply(@Param('id', ParseIntPipe) id: number, @Body(zod(ReplyDto)) b: z.infer<typeof ReplyDto>, @CurrentUser() u: AuthUser) { return this.svc.reply(u, id, b); }
  @Roles(...MESS_HEADS, 'Chief_Warden', 'Director_Hostels') @Post('mess-ops/grievance-days/raise') raise(@Body(zod(RaiseDto)) b: z.infer<typeof RaiseDto>, @CurrentUser() u: AuthUser) { return this.svc.raise(u, b); }

  @Roles(...MESS_STAFF) @Get('mess-ops/scan') scanSummary(@Query('mess_id', ParseIntPipe) m: number, @Query('meal') meal: string) { return this.svc.scanSummary(m, Meal.parse(meal)); }
  @Roles(...MESS_STAFF) @Post('mess-ops/scan') scan(@Body(zod(ScanDto)) b: z.infer<typeof ScanDto>, @CurrentUser() u: AuthUser) { return this.svc.scan(u, b); }

  @Roles(...MESS_VIEW) @Get('mess-ops/store') store(@Query('mess_id', ParseIntPipe) m: number) { return this.svc.store(m); }
  @Roles('Mess_Storekeeper', ...MESS_HEADS) @Post('mess-ops/store/receipts') receive(@Body(zod(ReceiptDto)) b: z.infer<typeof ReceiptDto>, @CurrentUser() u: AuthUser) { return this.svc.receive(u, b); }
  @Roles('Mess_Storekeeper', ...MESS_HEADS) @Post('mess-ops/store/issues') issue(@Body(zod(IssueDto)) b: z.infer<typeof IssueDto>, @CurrentUser() u: AuthUser) { return this.svc.issue(u, b); }
  @Roles('Mess_Supervisor', 'Chief_Chef', ...MESS_HEADS) @Post('mess-ops/store/issues/:id/acknowledge') ack(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.acknowledge(u, id); }
  @Roles(...MESS_HEADS) @Put('mess-ops/store/items/:sku') reorder(@Param('sku') sku: string, @Body(zod(z.object({ reorder_level: z.number().nonnegative() }))) b: { reorder_level: number }, @CurrentUser() u: AuthUser) { return this.svc.setReorder(u, sku, b.reorder_level); }

  @Roles(...MESS_VIEW) @Get('mess-ops/daily') daily(@Query('mess_id', ParseIntPipe) m: number, @Query('date') d: string) { return this.svc.daily(m, z.string().date().parse(d)); }
  @Roles('Mess_Supervisor', 'Chief_Chef', ...MESS_HEADS) @Put('mess-ops/daily') saveDaily(@Body(zod(DailyDto)) b: z.infer<typeof DailyDto>, @CurrentUser() u: AuthUser) { return this.svc.saveDaily(u, b); }

  @Roles(...MESS_VIEW, 'Pro_VC_Finance', 'President', 'Vice_President', 'Pro_VC') @Get('mess-ops/monthly') monthly(@Query('mess_id', ParseIntPipe) m: number, @Query('month') month: string) {
    return this.svc.monthly(m, z.string().regex(/^\d{4}-\d{2}$/).parse(month));
  }
}
