import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { TrackingService } from './tracking.service.js';
import { CurrentUser, Roles, SECURITY, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const ConsentDto = z.object({ student_id: z.string().optional(), given_by: z.enum(['Student', 'Parent']), contact_id: z.number().int().optional() });
const PointDto = z.object({
  point_name: z.string(), point_type: z.enum(['Room_Corridor', 'Hostel_Gate', 'Campus_Gate', 'Mess', 'Facility', 'Academic_Block']), facility_id: z.string(),
  zone_id: z.string().optional(), space_id: z.string().optional(), device_type: z.enum(['Camera', 'Card_Reader', 'QR_Scanner', 'Manual']), device_ref: z.string().optional(),
});
const MovementDto = z.object({
  student_id: z.string().optional(), qr_token: z.string().optional(), point_id: z.number().int(), direction: z.enum(['In', 'Out']),
  source: z.enum(['Scan', 'Camera', 'Manual']).optional(), match_confidence: z.number().min(0).max(100).optional(), event_at: z.string().optional(),
});
const AlertDto = z.object({ status: z.enum(['Acknowledged', 'Closed']), action_taken: z.string().optional(), parent_informed: z.boolean().optional() });

@ApiTags('D · student tracking')
@ApiBearerAuth()
@Controller()
export class TrackingController {
  constructor(private svc: TrackingService) {}

  @Post('consents') consent(@Body(zod(ConsentDto)) b: z.infer<typeof ConsentDto>, @CurrentUser() u: AuthUser) { return this.svc.consent(u, b); }
  @Post('consents/:id/withdraw') withdraw(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.withdraw(u, id); }
  @Roles('Office_Staff', ...WARDENS)
  @Get('students/:id/consents') consents(@Param('id') id: string) { return this.svc.consents(id); }

  @Roles(...SECURITY)
  @Get('capture-points') points(@Query('facility_id') f?: string) { return this.svc.capturePoints(f); }
  @Roles('Security_Officer', 'Chief_Warden')
  @Post('capture-points') addPoint(@Body(zod(PointDto)) b: z.infer<typeof PointDto>, @CurrentUser() u: AuthUser) { return this.svc.addCapturePoint(u, b); }

  @Roles(...SECURITY, 'system')
  @Post('movements') movement(@Body(zod(MovementDto)) b: z.infer<typeof MovementDto>, @CurrentUser() u: AuthUser) { return this.svc.movement(u, b); }

  @Roles(...SECURITY)
  @Get('students/:id/location') locate(@Param('id') id: string, @Query('purpose') purpose: 'Routine' | 'Alert' | 'Parent_Query' | 'Emergency' = 'Routine', @Query('alert_id') alertId: string | undefined, @CurrentUser() u: AuthUser) {
    return this.svc.locate(u, id, purpose, alertId ? Number(alertId) : undefined);
  }
  @Roles(...SECURITY)
  @Get('locations') board(@Query('facility_id') f: string, @Query('zone_id') z: string | undefined, @CurrentUser() u: AuthUser) { return this.svc.board(u, f, z); }

  @Roles(...SECURITY, 'Mess_Incharge', 'Accounts_Section')
  @Get('alerts') alerts(@Query('facility_id') facility_id: string | undefined, @Query('status') status: string | undefined, @Query('alert_type') alert_type: string | undefined, @Query('assigned_to') assigned_to: string | undefined, @CurrentUser() u: AuthUser) {
    return this.svc.alerts({ facility_id, status, alert_type, assigned_to }, u?.scope ?? null);
  }
  @Roles(...SECURITY, 'Mess_Incharge', 'Accounts_Section')
  @Post('alerts/:id') update(@Param('id', ParseIntPipe) id: number, @Body(zod(AlertDto)) b: z.infer<typeof AlertDto>, @CurrentUser() u: AuthUser) { return this.svc.updateAlert(u, id, b); }

  @Roles('Chief_Warden', 'Dean_Students_Affairs', 'Director_Hostels', 'Warden')
  @Get('reports/location-access-log') accessLog(@Query('student_id') s?: string, @Query('viewer') v?: string) { return this.svc.accessLog(s, v); }
}
