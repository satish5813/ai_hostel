import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { SentimentService } from './sentiment.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const FilterDto = z.object({
  from: z.string().date(), to: z.string().date(),
  mess_id: z.coerce.number().int().optional(), gender: z.enum(['All', 'Boys', 'Girls']).optional(),
});
const ExportDto = FilterDto.extend({ grain: z.enum(['day', 'week', 'month']) });
const RateDto = z.object({
  meal_date: z.string().date(), meal: z.enum(['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner']), dish: z.string().min(1).max(80),
  rating: z.number().int().min(1).max(5), comment: z.string().max(400).nullable().optional(),
});
/** Who sees the mess sentiment dashboard (RPT-12). */
export const SENTIMENT_VIEWERS = ['President', 'Vice_President', 'Pro_VC', 'Pro_VC_Finance', 'authority', 'Mess_Supervisor', 'Chief_Chef',
  'Mess_Incharge', 'Mess_Manager', 'Chief_Warden', 'Director_Hostels', 'admin'];

@ApiTags('MES · meal ratings and sentiment')
@ApiBearerAuth()
@Controller()
export class SentimentController {
  constructor(private svc: SentimentService) {}
  @Roles(...SENTIMENT_VIEWERS) @Get('mess-sentiment') dashboard(@Query(zod(FilterDto)) q: z.infer<typeof FilterDto>) { return this.svc.dashboard(q); }
  @Roles(...SENTIMENT_VIEWERS) @Get('mess-sentiment/export') export(@Query(zod(ExportDto)) q: z.infer<typeof ExportDto>) { return this.svc.export(q, q.grain); }
  @Roles('Student') @Get('me/meal-ratings') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Roles('Student') @Put('me/meal-ratings') rate(@Body(zod(RateDto)) b: z.infer<typeof RateDto>, @CurrentUser() u: AuthUser) { return this.svc.rate(u, b); }
}
