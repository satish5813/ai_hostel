import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { zod } from '../common/zod.pipe.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminService } from './admin.service.js';

const GrantDto = z.object({ role_code: z.string().min(1), scope_dept: z.string().min(1), approval_ref: z.string().min(3) });
const RuleDto = z.object({ sla_hours: z.number().int().positive().optional(), is_mandatory: z.boolean().optional(), status: z.enum(['Active', 'Inactive']).optional(), approver_role: z.string().optional() });
const SettingDto = z.object({ amount: z.number().optional(), value_text: z.string().optional() });
const VisibilityDto = z.object({ report_code: z.string().min(1), role_code: z.string().min(1), scope: z.enum(['Own', 'Floor', 'Hostel', 'All']), status: z.enum(['Active', 'Inactive']) });

/** Data Administrator only (ADM): system settings, never a workflow action. */
@ApiTags('ADM · users, rules, audit')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private svc: AdminService) {}

  @Get('roles') roles() { return this.svc.roles(); }
  @Get('users') users() { return this.svc.users(); }
  @Post('users/:id/roles') grant(@Param('id', ParseIntPipe) id: number, @Body(zod(GrantDto)) b: z.infer<typeof GrantDto>, @CurrentUser() u: AuthUser) { return this.svc.grant(u, id, b); }
  @Delete('users/:id/roles/:role/:dept') revoke(@Param('id', ParseIntPipe) id: number, @Param('role') role: string, @Param('dept') dept: string, @CurrentUser() u: AuthUser) { return this.svc.revoke(u, id, role, dept); }

  @Get('approval-rules') rules() { return this.svc.approvalRules(); }
  @Post('approval-rules/:id') rule(@Param('id', ParseIntPipe) id: number, @Body(zod(RuleDto)) b: z.infer<typeof RuleDto>, @CurrentUser() u: AuthUser) { return this.svc.updateRule(u, id, b); }
  @Get('settings') settings() { return this.svc.settings(); }
  @Post('settings/:key') setting(@Param('key') key: string, @Body(zod(SettingDto)) b: z.infer<typeof SettingDto>, @CurrentUser() u: AuthUser) { return this.svc.updateSetting(u, key, b); }
  @Get('report-visibility') visibility() { return this.svc.reportVisibility(); }
  @Post('report-visibility') setVisibility(@Body(zod(VisibilityDto)) b: z.infer<typeof VisibilityDto>, @CurrentUser() u: AuthUser) { return this.svc.setReportVisibility(u, b); }

  @Get('audit-log') audit(@Query('table') table?: string, @Query('actor') actor?: string, @Query('kind') kind?: string, @Query('limit') limit?: string) { return this.svc.auditLog({ table, actor, kind, limit: limit ? Number(limit) : undefined }); }
  @Get('audit-log/summary') auditSummary() { return this.svc.auditSummary(); }
}
