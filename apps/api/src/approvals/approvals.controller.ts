import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ApprovalsService } from './approvals.service.js';
import { CurrentUser } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const DecideDto = z.object({ decision: z.enum(['Approved', 'Rejected']), remarks: z.string().max(500).optional() });
const ParentDto = DecideDto.extend({ contact_id: z.number().int() });

@ApiTags('approvals (SH1/SH2)')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private svc: ApprovalsService) {}
  @Get('inbox') inbox(@CurrentUser() u: AuthUser) { return this.svc.inbox(u); }
  @Get(':type/:id') steps(@Param('type') type: string, @Param('id', ParseIntPipe) id: number) { return this.svc.steps(type, id); }
  @Post(':id/decide') decide(@Param('id', ParseIntPipe) id: number, @Body(zod(DecideDto)) b: z.infer<typeof DecideDto>, @CurrentUser() u: AuthUser) { return this.svc.decide(u, id, b.decision, b.remarks); }
  @Post(':id/parent') parent(@Param('id', ParseIntPipe) id: number, @Body(zod(ParentDto)) b: z.infer<typeof ParentDto>, @CurrentUser() u: AuthUser) { return this.svc.parent(u, id, b.contact_id, b.decision, b.remarks); }
}
