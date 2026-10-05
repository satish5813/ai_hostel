import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { GeneralService } from './general.service.js';

@ApiTags('GEN · screens everyone has')
@ApiBearerAuth()
@Controller()
export class GeneralController {
  constructor(private svc: GeneralService) {}

  /** GEN-01 My profile and contacts */
  @Get('me/profile') profile(@CurrentUser() u: AuthUser) { return this.svc.profile(u); }
  /** GEN-02 Notifications */
  @Get('notifications') notifications(@CurrentUser() u: AuthUser) { return this.svc.notifications(u); }
  /** RPT-07 Occupancy, fees and dues */
  @Roles('Warden', 'Chief_Warden', 'Director_Hostels', 'Accounts_Section', 'Pro_VC_Finance')
  @Get('reports/occupancy-fees-dues') rpt07(@CurrentUser() u: AuthUser) { return this.svc.reportOccupancyFeesDues(u); }
}
