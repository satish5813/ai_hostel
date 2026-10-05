import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AcadService } from './acad.service.js';
import { CurrentUser, MANAGEMENT, OFFICE, Roles, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const VIEW = [...OFFICE, ...MANAGEMENT, 'Counsellor', 'Faculty_Counsellor', 'HOD', 'hod', 'Dean_Academics', 'Principal', 'Pro_VC'];
const CertDto = z.object({ title: z.string().min(3).max(160), provider: z.string().min(2).max(80), category: z.enum(['Technical', 'Cloud', 'Programming', 'Language', 'Soft_Skill', 'Sports', 'Other']),
  issued_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), credential_ref: z.string().max(200).optional() });
const AchDto = z.object({ title: z.string().min(3).max(160), level: z.enum(['Hostel', 'University', 'State', 'National', 'International']), category: z.string().max(40).optional(),
  achieved_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), award: z.string().max(80).optional() });

@ApiTags('L · student 360: academics, CRT, skills, achievements')
@ApiBearerAuth()
@Controller()
export class AcadController {
  constructor(private svc: AcadService) {}
  @Get('students/:id/360') profile(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.svc.profile(u, id); }
  @Roles(...VIEW) @Get('acad/board') board(@CurrentUser() u: AuthUser, @Query('facility_id') f?: string) { return this.svc.board(u, f || undefined); }
  @Roles('Student') @Post('me/certifications') cert(@Body(zod(CertDto)) b: z.infer<typeof CertDto>, @CurrentUser() u: AuthUser) { return this.svc.addCert(u, b); }
  @Roles('Student') @Post('me/achievements') ach(@Body(zod(AchDto)) b: z.infer<typeof AchDto>, @CurrentUser() u: AuthUser) { return this.svc.addAchievement(u, b); }
  @Roles(...WARDENS) @Post('acad/certifications/:id/verify') vc(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.verify(u, 'certification', id); }
  @Roles(...WARDENS) @Post('acad/achievements/:id/verify') va(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.verify(u, 'achievement', id); }
}
