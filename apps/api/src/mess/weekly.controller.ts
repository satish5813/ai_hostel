import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ENTERERS, PUBLISHERS, WeeklyMenuService } from './weekly.service.js';
import { SENTIMENT_VIEWERS } from './sentiment.controller.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const Meal = z.enum(['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner']);
const Day = z.number().int().min(1).max(7);
const CreateDto = z.object({ mess_id: z.number().int(), week_start: z.string().date(), copy_from: z.number().int().optional() });
const WeekDto = z.object({ choices_close_at: z.string().datetime({ offset: true }).optional(), notes: z.string().max(400).nullable().optional() });
// non-veg is chicken and egg only: seafood and red meat are not served (the database checks the same rule, migration 127)
const NOT_SERVED = /\b(fish|fishes|prawn|prawns|shrimp|crab|squid|mutton|lamb|goat|beef|pork)\b/i;
const allowed = (s: string) => !NOT_SERVED.test(s);
const NOT_SERVED_MSG = 'Non-veg is chicken and egg only. Fish, prawns, mutton and other meat are not served.';
const FixedDto = z.object({ meal: Meal, cuisine: z.enum(['South', 'North']), items: z.string().min(1).max(300).refine(allowed, NOT_SERVED_MSG) });
const DishDto = z.object({ dish: z.string().trim().min(2).max(80).refine(allowed, NOT_SERVED_MSG), cuisine: z.enum(['South', 'North', 'Both']), diet: z.enum(['Veg', 'Non_Veg']) });
const OptionDto = DishDto.extend({ day_no: Day, meal: Meal, course_code: z.string().max(20) });
const CopyDto = z.object({ from_day: Day, to_days: z.array(Day).min(1).max(6) });
const ChoiceDto = z.object({ day_no: Day, meal: Meal, course_code: z.string().max(20), option_id: z.number().int().nullable() });
const FillDto = z.object({ cuisine: z.enum(['South', 'North']), diet: z.enum(['Veg', 'Non_Veg']), overwrite: z.boolean().optional() });

/** Mess In-charge and Chef write the week; the Mess In-charge publishes it. */
const MAKE = [...PUBLISHERS, 'Chief_Chef', 'Cook', 'Catering'];
const SEE = [...MAKE, 'Mess_Supervisor', 'Chief_Warden', 'Director_Hostels', 'admin'];
const REPORT = [...new Set([...SEE, ...SENTIMENT_VIEWERS])];

@ApiTags('MES · weekly menu and choices')
@ApiBearerAuth()
@Controller()
export class WeeklyMenuController {
  constructor(private svc: WeeklyMenuService) {}

  @Roles(...REPORT) @Get('weekly-menus') list() { return this.svc.list(); }
  @Roles(...SEE) @Get('weekly-menus/:id') detail(@Param('id', ParseIntPipe) id: number) { return this.svc.detail(id); }
  @Roles(...REPORT) @Get('weekly-menus/:id/report') report(@Param('id', ParseIntPipe) id: number) { return this.svc.report(id); }
  @Roles(...MAKE) @Post('weekly-menus') create(@Body(zod(CreateDto)) b: z.infer<typeof CreateDto>, @CurrentUser() u: AuthUser) { return this.svc.create(u, b); }
  @Roles(...MAKE) @Put('weekly-menus/:id') update(@Param('id', ParseIntPipe) id: number, @Body(zod(WeekDto)) b: z.infer<typeof WeekDto>, @CurrentUser() u: AuthUser) { return this.svc.update(u, id, b); }
  @Roles(...MAKE) @Put('weekly-menus/:id/fixed') fixed(@Param('id', ParseIntPipe) id: number, @Body(zod(FixedDto)) b: z.infer<typeof FixedDto>, @CurrentUser() u: AuthUser) { return this.svc.setFixed(u, id, b); }
  @Roles(...MAKE) @Post('weekly-menus/:id/options') add(@Param('id', ParseIntPipe) id: number, @Body(zod(OptionDto)) b: z.infer<typeof OptionDto>, @CurrentUser() u: AuthUser) { return this.svc.addOption(u, id, b); }
  @Roles(...MAKE) @Post('weekly-menus/:id/copy-day') copyDay(@Param('id', ParseIntPipe) id: number, @Body(zod(CopyDto)) b: z.infer<typeof CopyDto>, @CurrentUser() u: AuthUser) { return this.svc.copyDay(u, id, b); }
  @Roles(...PUBLISHERS) @Post('weekly-menus/:id/publish') publish(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.publish(u, id); }
  @Roles(...MAKE) @Delete('weekly-menus/:id') discard(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.discard(u, id); }
  @Roles(...MAKE) @Put('weekly-menu-options/:id') edit(@Param('id', ParseIntPipe) id: number, @Body(zod(DishDto)) b: z.infer<typeof DishDto>, @CurrentUser() u: AuthUser) { return this.svc.editOption(u, id, b); }
  @Roles(...MAKE) @Delete('weekly-menu-options/:id') remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.removeOption(u, id); }

  @Roles(...ENTERERS) @Get('weekly-menus/:id/residents') residents(@Param('id', ParseIntPipe) id: number) { return this.svc.residents(id); }
  @Roles(...ENTERERS) @Get('weekly-menus/:id/students/:sid') studentWeek(@Param('id', ParseIntPipe) id: number, @Param('sid') sid: string) { return this.svc.studentWeek(id, sid); }
  @Roles(...ENTERERS) @Put('weekly-menus/:id/students/:sid') enter(@Param('id', ParseIntPipe) id: number, @Param('sid') sid: string, @Body(zod(ChoiceDto)) b: z.infer<typeof ChoiceDto>, @CurrentUser() u: AuthUser) {
    return this.svc.enterChoice(u, id, sid, b);
  }

  @Roles('Student') @Get('me/meal-choices') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Roles('Student') @Put('me/meal-choices/:weekId') choose(@Param('weekId', ParseIntPipe) id: number, @Body(zod(ChoiceDto)) b: z.infer<typeof ChoiceDto>, @CurrentUser() u: AuthUser) { return this.svc.choose(u, id, b); }
  @Roles('Student') @Post('me/meal-choices/:weekId/fill') fill(@Param('weekId', ParseIntPipe) id: number, @Body(zod(FillDto)) b: z.infer<typeof FillDto>, @CurrentUser() u: AuthUser) { return this.svc.fill(u, id, b); }
}
