import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { OutpassService } from './outpass.service.js';
import { CurrentUser, Roles, SECURITY } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const ApplyDto = z.object({
  reason: z.string().min(3).max(500), destination: z.string().min(2).max(200),
  leave_from: z.string().datetime({ offset: true }), return_by: z.string().datetime({ offset: true }),
  contact_during_leave: z.string().regex(/^[0-9+ ]{10,15}$/),
}).refine((d) => new Date(d.return_by) > new Date(d.leave_from), { message: 'return_by must be after leave_from' });

@ApiTags('E · outing permission')
@ApiBearerAuth()
@Controller()
export class OutpassController {
  constructor(private svc: OutpassService) {}
  @Post('outpasses') apply(@Body(zod(ApplyDto)) b: z.infer<typeof ApplyDto>, @CurrentUser() u: AuthUser) { return this.svc.apply(u, b); }
  @Get('outpasses/mine') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Roles(...SECURITY, 'Dean_Students_Affairs')
  @Get('outpasses') list(@Query('facility_id') facility_id: string | undefined, @Query('status') status: string | undefined, @CurrentUser() u: AuthUser) { return this.svc.list({ facility_id, status }, u?.scope ?? null); }
  @Get('outpasses/:id') get(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.get(id, u); }
  @Get('outpasses/:id/qr') qr(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.qr(u, id); }
  @Post('outpasses/:id/cancel') cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.cancel(u, id); }
  @Roles(...SECURITY)
  @Get('gate/verify') verify(@Query('token') token: string) { return this.svc.verify(token); }
}
