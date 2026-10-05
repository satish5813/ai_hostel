import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CareService, GRIEVANCE_STAFF } from './care.service.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const CHECKLIST_ROLES = ['Floor_Warden', 'Warden', 'Chief_Warden', 'Director_Hostels', 'Mess_Incharge', 'Mess_Manager', 'Mess_Supervisor', 'Mess_Storekeeper', 'admin'];
const SubmitDto = z.object({ template_id: z.number().int(), facility_id: z.string().max(30), zone_id: z.string().max(30).nullable().optional(), period_date: z.string().date(),
  shift: z.enum(['Morning', 'Evening']).nullable().optional(),
  answers: z.array(z.object({ item_no: z.number().int(), answer: z.enum(['Yes', 'No', 'OK', 'Not_OK', 'Green', 'Yellow', 'Red']), remarks: z.string().max(300).nullable().optional(), space_id: z.string().max(30).nullable().optional() })).min(1).max(80) });
const ReviewDto = z.object({ overall_status: z.enum(['Satisfactory', 'Minor_Corrections', 'Needs_Attention', 'Urgent_Action']), remarks: z.string().max(400).nullable().optional() });
const GrievanceDto = z.object({ student_id: z.string().max(20).optional(), category: z.enum(['Room_Mate', 'Discipline', 'Mess', 'Staff_Conduct', 'Ragging', 'Safety', 'Other']),
  description: z.string().trim().min(10, 'Describe the grievance (at least 10 letters)').max(1500), is_confidential: z.boolean().default(false) });
const ActDto = z.object({ status: z.enum(['In_Review', 'Escalated', 'Closed']), action_taken: z.string().trim().max(1000).nullable().optional() });

@ApiTags('H · checklists and grievances')
@ApiBearerAuth()
@Controller()
export class CareController {
  constructor(private svc: CareService) {}

  @Roles(...CHECKLIST_ROLES) @Get('checklists') list(@CurrentUser() u: AuthUser) { return this.svc.checklists(u); }
  @Roles(...CHECKLIST_ROLES) @Get('checklists/templates/:id') template(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.template(u, id); }
  @Roles(...CHECKLIST_ROLES) @Post('checklists/submissions') submit(@Body(zod(SubmitDto)) b: z.infer<typeof SubmitDto>, @CurrentUser() u: AuthUser) { return this.svc.submit(u, b); }
  @Roles(...CHECKLIST_ROLES) @Get('checklists/submissions/:id') one(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.submission(u, id); }
  @Roles(...CHECKLIST_ROLES) @Post('checklists/submissions/:id/review') review(@Param('id', ParseIntPipe) id: number, @Body(zod(ReviewDto)) b: z.infer<typeof ReviewDto>, @CurrentUser() u: AuthUser) { return this.svc.review(u, id, b); }

  @Roles('Student') @Get('me/grievances') mine(@CurrentUser() u: AuthUser) { return this.svc.myGrievances(u); }
  @Roles('Student') @Post('me/grievances') raiseMine(@Body(zod(GrievanceDto)) b: z.infer<typeof GrievanceDto>, @CurrentUser() u: AuthUser) { return this.svc.raise(u, b); }
  @Roles(...GRIEVANCE_STAFF) @Get('grievances') grievances(@CurrentUser() u: AuthUser, @Query('status') s?: string) { return this.svc.grievances(u, s || undefined); }
  @Roles('Room_Allotment', 'Office_Staff', 'Warden', 'Chief_Warden', 'Director_Hostels', 'admin') @Post('grievances') raise(@Body(zod(GrievanceDto)) b: z.infer<typeof GrievanceDto>, @CurrentUser() u: AuthUser) { return this.svc.raise(u, b); }
  @Roles(...GRIEVANCE_STAFF) @Post('grievances/:id/act') act(@Param('id', ParseIntPipe) id: number, @Body(zod(ActDto)) b: z.infer<typeof ActDto>, @CurrentUser() u: AuthUser) { return this.svc.act(u, id, b); }
}
