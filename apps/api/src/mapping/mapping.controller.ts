import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { MappingService } from './mapping.service.js';
import { CurrentUser, Public, Roles, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const AssignDto = z.object({
  staff_id: z.string(), hostel_role: z.string(), facility_id: z.string(), zone_id: z.string().optional(), space_id: z.string().optional(),
  shift: z.enum(['Morning', 'Evening', 'Night', 'General']).optional(), from_date: z.string().optional(), show_on_qr: z.boolean().optional(),
});
const MANAGERS = ['Chief_Warden', 'Director_Hostels', 'Dean_Students_Affairs', 'Hostel_Incharge', 'Housekeeping_Supervisor', 'Office_Staff'];

@ApiTags('B · mapping people to rooms')
@ApiBearerAuth()
@Controller()
export class MappingController {
  constructor(private svc: MappingService) {}

  @Roles(...WARDENS, 'Office_Staff', 'Security_Officer', 'Housekeeping_Supervisor', 'Dean_Students_Affairs', 'admin')
  @Get('assignments') list(@Query('facility_id') f?: string, @Query('all') all?: string) { return this.svc.assignments(f, all !== '1'); }
  @Roles(...MANAGERS)
  @Post('assignments') assign(@Body(zod(AssignDto)) b: z.infer<typeof AssignDto>, @CurrentUser() u: AuthUser) { return this.svc.assign(u, b); }
  @Roles(...MANAGERS)
  @Post('assignments/:id/end') end(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ to_date: z.string().optional() }))) b: { to_date?: string }, @CurrentUser() u: AuthUser) {
    return this.svc.end(u, id, b.to_date);
  }

  @Roles('Office_Staff', ...WARDENS)
  @Post('spaces/:spaceId/qr') generate(@Param('spaceId') s: string, @CurrentUser() u: AuthUser) { return this.svc.generateQr(u, s); }
  @Roles('Office_Staff', ...WARDENS)
  @Get('spaces/:spaceId/qr/label') label(@Param('spaceId') s: string, @Req() req: Request) {
    return this.svc.label(s, process.env.WEB_URL ?? `${req.protocol}://${req.get('host')?.replace(/:4000$/, ':3000')}`);
  }
  @Roles('Office_Staff', ...WARDENS)
  @Post('qr/:id/printed') printed(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.markPrinted(u, id); }

  @Public()
  @Get('qr/:token') page(@Param('token') token: string) { return this.svc.qrPage(token); }

  @Roles(...WARDENS)
  @Get('reports/floors-without-warden') floors() { return this.svc.floorsWithoutWarden(); }
}
