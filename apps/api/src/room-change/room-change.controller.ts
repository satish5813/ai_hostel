import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RC_VIEW, RC_WARDENS, RoomChangeService } from './room-change.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const RequestDto = z.object({
  kind: z.enum(['Room_Type', 'Same_Type']), to_room_type_id: z.number().int().positive().nullable().optional(),
  to_subspace_id: z.string().max(30).nullable().optional(), reason: z.string().trim().min(10, 'Say why in a sentence (at least 10 letters)').max(600),
});
const DecideDto = z.object({ decision: z.enum(['Approved', 'Rejected']), remarks: z.string().trim().max(400).nullable().optional() });
const DirectDto = z.object({ student_id: z.string().max(20), to_subspace_id: z.string().max(30), reason: z.string().trim().min(10, 'Say why in a sentence (at least 10 letters)').max(600),
  move_now: z.boolean().default(false), meter_reading: z.number().nonnegative().nullable().optional(), key_no: z.string().trim().max(20).nullable().optional() });
const CompleteDto = z.object({ meter_reading: z.number().nonnegative().nullable().optional(), key_no: z.string().trim().max(20).nullable().optional() });

@ApiTags('RCH · room change')
@ApiBearerAuth()
@Controller()
export class RoomChangeController {
  constructor(private svc: RoomChangeService) {}

  @Roles('Student') @Get('me/room-change') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Roles('Student') @Get('me/room-change/beds') beds(@CurrentUser() u: AuthUser, @Query('type', ParseIntPipe) type: number) { return this.svc.beds(u, type); }
  @Roles('Student') @Get('me/room-change/preview') preview(@CurrentUser() u: AuthUser, @Query('type', ParseIntPipe) type: number) { return this.svc.preview(u, type); }
  @Roles('Student') @Post('me/room-change') request(@Body(zod(RequestDto)) b: z.infer<typeof RequestDto>, @CurrentUser() u: AuthUser) { return this.svc.request(u, b); }
  @Roles('Student') @Post('me/room-change/:id/cancel') cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.cancel(u, id); }

  @Roles('Chief_Warden', 'Director_Hostels', 'admin') @Get('room-changes/residents') residents(@CurrentUser() u: AuthUser, @Query('q') q?: string) { return this.svc.residents(u, q || undefined); }
  @Roles('Chief_Warden', 'Director_Hostels', 'admin') @Get('room-changes/options/:sid') options(@Param('sid') sid: string, @CurrentUser() u: AuthUser) { return this.svc.options(u, sid); }
  @Roles('Chief_Warden', 'Director_Hostels', 'admin') @Get('room-changes/preview/:sid') staffPreview(@Param('sid') sid: string, @Query('type', ParseIntPipe) type: number, @CurrentUser() u: AuthUser) {
    return this.svc.staffPreview(u, sid, type);
  }
  @Roles('Chief_Warden', 'Director_Hostels', 'admin') @Post('room-changes/direct') direct(@Body(zod(DirectDto)) b: z.infer<typeof DirectDto>, @CurrentUser() u: AuthUser) { return this.svc.direct(u, b); }
  @Roles(...RC_VIEW) @Get('room-changes') list(@CurrentUser() u: AuthUser, @Query('status') s?: string) { return this.svc.list(u, s || undefined); }
  @Roles(...RC_VIEW, 'Student') @Get('room-changes/:id') detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.detail(u, id); }
  @Roles('Chief_Warden', 'Director_Hostels', 'admin') @Put('room-changes/:id/bed') bed(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ subspace_id: z.string().max(30) }))) b: { subspace_id: string }, @CurrentUser() u: AuthUser) {
    return this.svc.setBed(u, id, b.subspace_id);
  }
  @Roles(...RC_WARDENS) @Post('room-changes/:id/decide') decide(@Param('id', ParseIntPipe) id: number, @Body(zod(DecideDto)) b: z.infer<typeof DecideDto>, @CurrentUser() u: AuthUser) {
    return this.svc.decide(u, id, b.decision, b.remarks);
  }
  @Roles(...RC_WARDENS) @Post('room-changes/:id/complete') complete(@Param('id', ParseIntPipe) id: number, @Body(zod(CompleteDto)) b: z.infer<typeof CompleteDto>, @CurrentUser() u: AuthUser) {
    return this.svc.complete(u, id, b);
  }
}
