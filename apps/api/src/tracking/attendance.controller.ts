import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { zod } from '../common/zod.pipe.js';
import { CurrentUser, Roles, WARDENS } from '../auth/decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AttendanceService } from './attendance.service.js';

const MarkDto = z.object({ att_date: z.string().date(), facility_id: z.string(), marks: z.array(z.object({ student_id: z.string(), status: z.enum(['Present', 'Absent', 'On_Pass', 'Sick_Leave']), remarks: z.string().optional() })).min(1) });

@ApiTags('D · attendance register')
@ApiBearerAuth()
@Controller()
export class AttendanceController {
  constructor(private svc: AttendanceService) {}

  @Roles(...WARDENS)
  @Get('attendance') register(@Query('facility_id') f: string, @Query('from') from: string, @Query('to') to: string, @CurrentUser() u: AuthUser) { return this.svc.register(u, f, from, to); }
  @Roles('Floor_Warden', 'Warden', 'Assistant_Warden', 'Chief_Warden')
  @Post('attendance/mark') mark(@Body(zod(MarkDto)) b: z.infer<typeof MarkDto>, @CurrentUser() u: AuthUser) { return this.svc.mark(u, b); }
}
