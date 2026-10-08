import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { PortalService } from './portal.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const BuildDto = z.object({
  floors: z.number().int().min(1).max(30), ground: z.boolean(), rooms_per_floor: z.number().int().min(1).max(99),
  ranges: z.array(z.object({ from: z.number().int().min(1), to: z.number().int().min(1), room_type_id: z.number().int() })).min(1).max(20),
  dry_run: z.boolean(),
});
const LoginDto = z.object({
  staff_id: z.string().min(1).max(20), role: z.enum(['Chief_Warden', 'Room_Allotment']),
  facility_ids: z.array(z.string().max(20)).max(30), approval_ref: z.string().min(3).max(60),
});
const day = z.string().date().nullable();

@ApiTags('ADM · administrator portal')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class PortalController {
  constructor(private svc: PortalService) {}
  @Post('hostels/:id/build') build(@Param('id') id: string, @Body(zod(BuildDto)) b: z.infer<typeof BuildDto>, @CurrentUser() u: AuthUser) { return this.svc.build(u, id, b); }
  @Get('readiness') readiness() { return this.svc.readiness(); }
  @Get('logins') logins() { return this.svc.logins(); }
  @Post('logins') save(@Body(zod(LoginDto)) b: z.infer<typeof LoginDto>, @CurrentUser() u: AuthUser) { return this.svc.saveLogin(u, b); }
  @Post('logins/:staff/:role/disable') disable(@Param('staff') s: string, @Param('role') r: string, @CurrentUser() u: AuthUser) {
    return this.svc.disableLogin(u, s, z.enum(['Chief_Warden', 'Room_Allotment']).parse(r));
  }
  @Post('academic-years/:year/renewal-window') renewal(@Param('year') y: string, @Body(zod(z.object({ opens: day, closes: day }))) b: { opens: string | null; closes: string | null }, @CurrentUser() u: AuthUser) {
    return this.svc.setRenewalWindow(u, y, b);
  }
  @Post('academic-years/:year/window') window(@Param('year') y: string, @Body(zod(z.object({ opens: day, closes: day }))) b: { opens: string | null; closes: string | null }, @CurrentUser() u: AuthUser) {
    return this.svc.setWindow(u, y, b);
  }
}
