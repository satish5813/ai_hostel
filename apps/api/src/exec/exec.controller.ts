import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExecService } from './exec.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { assertScope } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Who sees the executive dashboard (EXE-01). Ladies_Hostels_Head and Boys_Hostels_Head see only the hostels given to the login. */
export const EXECUTIVES = ['President', 'Vice_President', 'Pro_VC', 'Pro_VC_Finance', 'Pro_VC_Academics', 'Vice_Chancellor', 'Dean_Students_Affairs',
  'Senior_Management', 'Ladies_Hostels_Head', 'Boys_Hostels_Head', 'authority', 'admin'];

@ApiTags('EXE · executive dashboard')
@ApiBearerAuth()
@Controller('exec')
export class ExecController {
  constructor(private svc: ExecService) {}
  @Roles(...EXECUTIVES) @Get('overview') overview(@CurrentUser() u: AuthUser) { return this.svc.overview(u); }
  @Roles(...EXECUTIVES) @Get('buildings/:id') building(@CurrentUser() u: AuthUser, @Param('id') id: string) { assertScope(u, id); return this.svc.building(id, u); }
  @Roles(...EXECUTIVES) @Get('fees') fees(@CurrentUser() u: AuthUser) { return this.svc.fees(u); }
  @Roles(...EXECUTIVES) @Get('fees/:id/students') feeStudents(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('bucket') bucket = 'all') { assertScope(u, id); return this.svc.feeStudents(id, bucket); }
  @Roles(...EXECUTIVES) @Get('careers/matrix') careerMatrix(@CurrentUser() u: AuthUser, @Query('facility') facility = 'all') { if (facility !== 'all') assertScope(u, facility); return this.svc.careerMatrix(facility, u); }
  @Roles(...EXECUTIVES) @Get('careers/:id/students') careerStudents(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('goal') goal = 'all', @Query('bucket') bucket = 'all') {
    if (id !== 'all') assertScope(u, id);
    return this.svc.careerStudents(id, goal, bucket, u);
  }
}
