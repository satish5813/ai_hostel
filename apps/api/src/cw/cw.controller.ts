import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CwService } from './cw.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const CW = ['Chief_Warden', 'Director_Hostels'];
const DESK = ['Room_Allotment', 'Office_Staff', ...CW];
const NewDto = z.object({
  kind: z.enum(['Blocked_Room', 'Reserved_Room', 'Other_Room_Type', 'Waitlist_Jump', 'Transfer', 'Staff_Room']),
  registration_id: z.number().int().optional(), from_alloc_id: z.number().int().optional(), staff_id: z.string().max(20).optional(),
  subspace_id: z.string().min(1).max(30), key_no: z.string().max(20).optional(), reason: z.string().trim().min(5).max(600),
});
const DecideDto = z.object({ decision: z.enum(['Approved', 'Refused']), remarks: z.string().max(600).optional() });

@ApiTags('CW · Chief Warden portal')
@ApiBearerAuth()
@Controller()
export class CwController {
  constructor(private svc: CwService) {}
  @Roles(...CW) @Get('cw/overview') overview(@CurrentUser() u: AuthUser) { return this.svc.overview(u); }
  @Roles(...DESK) @Get('exceptions') list(@CurrentUser() u: AuthUser, @Query('status') s?: string, @Query('facility_id') f?: string) { return this.svc.exceptions(u, { status: s || undefined, facility_id: f || undefined }); }
  @Roles(...DESK) @Post('exceptions') create(@Body(zod(NewDto)) b: z.infer<typeof NewDto>, @CurrentUser() u: AuthUser) { return this.svc.create(u, b); }
  @Roles(...CW) @Post('exceptions/:id/decide') decide(@Param('id', ParseIntPipe) id: number, @Body(zod(DecideDto)) b: z.infer<typeof DecideDto>, @CurrentUser() u: AuthUser) { return this.svc.decide(u, id, b); }
  @Roles(...DESK) @Post('exceptions/:id/cancel') cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.cancel(u, id); }
  @Roles(...DESK) @Get('stays') stays(@CurrentUser() u: AuthUser, @Query('facility_id') f: string, @Query('q') q?: string) { return this.svc.stays(u, f, q); }
}
