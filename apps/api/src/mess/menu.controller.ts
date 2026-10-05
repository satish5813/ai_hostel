import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { MenuService } from './menu.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const KindDto = z.object({
  hostel_gender: z.enum(['Boys', 'Girls', 'Any']), region: z.enum(['South', 'North', 'International']), country: z.string().max(60).nullable().optional(),
  diet: z.enum(['Veg', 'Non_Veg']), mess_id: z.number().int().nullable().optional(), copy_from: z.number().int().optional(),
});
const MealDto = z.object({ day_no: z.number().int().min(1).max(7), meal: z.enum(['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner']), dishes: z.string().min(1).max(400) });
const FoodDto = z.object({ region: z.enum(['South', 'North', 'International']), diet: z.enum(['Veg', 'Non_Veg']), country: z.string().max(60).nullable().optional() });
const EDIT = ['admin', 'Chief_Warden', 'Director_Hostels'];
const VIEW = [...EDIT, 'Room_Allotment', 'Office_Staff', 'Mess_Manager'];

@ApiTags('MES · routine menu')
@ApiBearerAuth()
@Controller()
export class MenuController {
  constructor(private svc: MenuService) {}
  @Roles(...VIEW) @Get('menus') cycles() { return this.svc.cycles(); }
  @Roles(...VIEW) @Get('menus/:id') cycle(@Param('id', ParseIntPipe) id: number) { return this.svc.cycle(id); }
  @Roles(...EDIT) @Post('menus') draft(@Body(zod(KindDto)) b: z.infer<typeof KindDto>, @CurrentUser() u: AuthUser) { return this.svc.draft(u, b); }
  @Roles(...EDIT) @Put('menus/:id/meals') meal(@Param('id', ParseIntPipe) id: number, @Body(zod(MealDto)) b: z.infer<typeof MealDto>, @CurrentUser() u: AuthUser) { return this.svc.setMeal(u, id, b); }
  @Roles(...EDIT) @Put('menus/:id') notes(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ notes: z.string().max(400).nullable().optional(), effective_from: z.string().date().optional() }))) b: { notes?: string | null; effective_from?: string }, @CurrentUser() u: AuthUser) {
    return this.svc.setNotes(u, id, b);
  }
  @Roles('Chief_Warden', 'Director_Hostels') @Post('menus/:id/approve') approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.approve(u, id); }
  @Roles(...EDIT) @Delete('menus/:id') discard(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.discard(u, id); }
  @Roles('admin') @Post('menus/hostels/:id/accommodation') accommodation(@Param('id') id: string, @Body(zod(z.object({ type: z.enum(['Hostel', 'Apartment']) }))) b: { type: 'Hostel' | 'Apartment' }, @CurrentUser() u: AuthUser) {
    return this.svc.setAccommodation(u, id, b.type);
  }
  @Roles('Student') @Get('me/menu') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Roles('Student') @Delete('me/food') withdraw(@CurrentUser() u: AuthUser) { return this.svc.withdrawFood(u); }
  @Roles('Student') @Post('me/food') food(@Body(zod(FoodDto)) b: z.infer<typeof FoodDto>, @CurrentUser() u: AuthUser) { return this.svc.setFood(u, b); }
}
