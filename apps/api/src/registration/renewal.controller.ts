import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RenewalService } from './renewal.service.js';
import { CurrentUser, OFFICE, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const ChoiceDto = z.object({ choice: z.enum(['Keep', 'Change', 'Leave']), facility_id: z.string().max(30).optional(), room_type_id: z.number().int().optional() });

@ApiTags('A · yearly renewal')
@ApiBearerAuth()
@Controller()
export class RenewalController {
  constructor(private svc: RenewalService) {}
  @Roles('Student') @Get('me/renewal') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Roles('Student') @Post('me/renewal') choose(@Body(zod(ChoiceDto)) b: z.infer<typeof ChoiceDto>, @CurrentUser() u: AuthUser) { return this.svc.choose(u, b); }
  @Roles('Student') @Post('registrations/:id/keep-room') keep(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.keepRoom(u, id); }
  @Roles(...OFFICE) @Get('renewals') board(@CurrentUser() u: AuthUser, @Query('facility_id') f?: string) { return this.svc.board(u, f || undefined); }
  @Roles('Room_Allotment', 'Office_Staff', 'Chief_Warden', 'Director_Hostels') @Post('registrations/:id/continue-stay')
  continueStay(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ key_no: z.string().max(20).optional() }))) b: { key_no?: string }, @CurrentUser() u: AuthUser) {
    return this.svc.continueStay(u, id, b.key_no);
  }
}
