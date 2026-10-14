import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CareerService } from './career.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import { assertScope } from '../auth/scope.js';
import { EXECUTIVES } from '../exec/exec.controller.js';
import type { AuthUser } from '../auth/auth.types.js';

const OutcomeDto = z.object({
  student_id: z.string().max(20), outcome_type: z.enum(['Placement', 'Higher_Studies', 'Competitive_Exam', 'Entrepreneurship']), stage: z.string().max(20),
  organisation: z.string().trim().min(2).max(120), detail: z.string().max(120).nullable().optional(), ctc_lpa: z.number().positive().max(499).nullable().optional(),
  country: z.string().max(60).nullable().optional(), score: z.string().max(40).nullable().optional(), funding_inr: z.number().min(0).nullable().optional(),
  stage_on: z.string().date().optional(), verified: z.boolean().optional(), notes: z.string().max(300).nullable().optional(),
});
/** Student by student: the Chief Manager (own hostels), the Deans. Executives get buildings only. */
const TRACKERS = ['Chief_Warden', 'Director_Hostels', 'Dean_Students_Affairs', 'Dean_Students_Progression', 'admin'];

@ApiTags('CAR · career tracker')
@ApiBearerAuth()
@Controller('career')
export class CareerController {
  constructor(private svc: CareerService) {}
  private names = (u: AuthUser) => u.roles.some((r) => TRACKERS.includes(r));

  @Roles(...TRACKERS, ...EXECUTIVES) @Get('second-year') second(@CurrentUser() u: AuthUser, @Query('facility_id') f?: string) {
    assertScope(u, f); return this.svc.secondYear(u, f || undefined, this.names(u));
  }
  @Roles(...TRACKERS, ...EXECUTIVES) @Get('final-year') final(@CurrentUser() u: AuthUser, @Query('facility_id') f?: string) {
    assertScope(u, f); return this.svc.finalYear(u, f || undefined, this.names(u));
  }
  @Roles(...TRACKERS) @Get('stages') stages() { return this.svc.stages(); }
  @Roles(...TRACKERS) @Post('outcomes') add(@Body(zod(OutcomeDto)) b: z.infer<typeof OutcomeDto>, @CurrentUser() u: AuthUser) { return this.svc.addOutcome(u, b); }
  @Roles(...TRACKERS) @Put('outcomes/:id') update(@Param('id', ParseIntPipe) id: number, @Body(zod(OutcomeDto.partial())) b: Partial<z.infer<typeof OutcomeDto>>, @CurrentUser() u: AuthUser) {
    return this.svc.updateOutcome(u, id, b);
  }
}
