import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AccountsService } from './accounts.service.js';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

// eight characters or more, with a letter and a digit: long enough to resist guessing, short enough to be typed on a phone
const Password = z.string().min(8, 'At least 8 characters').max(100).refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), 'Use at least one letter and one digit');
const LoginDto = z.object({ username: z.string().trim().min(1).max(40), password: z.string().min(1).max(100) });
const SetDto = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/, 'This link is not complete'), password: Password });
const RegStartDto = z.object({ id: z.string().trim().regex(/^[A-Za-z0-9]{6,20}$/, 'Type your university ID') });
const RegFinishDto = z.object({ id: z.string().trim().regex(/^[A-Za-z0-9]{6,20}$/), code: z.string().trim().regex(/^\d{6}$/, 'The code has 6 digits'), password: Password });
const ChangeDto = z.object({ current: z.string().min(1).max(100), next: Password });
const CreateDto = z.object({ kind: z.enum(['student', 'staff']), user_ref: z.string().trim().min(1).max(20), email: z.string().trim().email().max(160).nullable().optional(),
  role: z.string().max(40).optional(), facility_ids: z.array(z.string().max(20)).max(60).optional(), approval_ref: z.string().trim().max(60).optional(), send: z.boolean().optional() });
const BulkDto = z.object({ scope: z.enum(['students', 'residents', 'staff', 'list']), ids: z.array(z.string().max(20)).max(20000).optional(), facility_id: z.string().max(20).optional(), send: z.boolean().optional() });

/** Signing in with a password, and setting it from the one-time link (public; rate-limited as every /auth path is). */
@ApiTags('auth · password logins')
@Controller('auth')
export class AuthController {
  constructor(private svc: AccountsService) {}
  @Public() @Post('login') login(@Body(zod(LoginDto)) b: z.infer<typeof LoginDto>) { return this.svc.login(b.username, b.password); }
  @Public() @Get('invite/:token') invite(@Param('token') token: string) { return this.svc.invite(token); }
  @Public() @Post('set-password') set(@Body(zod(SetDto)) b: z.infer<typeof SetDto>) { return this.svc.setPassword(b.token, b.password); }
  // a student creates (or resets) their own login with a code e-mailed to <id>@kluniversity.in (migration 131)
  @Public() @Post('register/start') regStart(@Body(zod(RegStartDto)) b: z.infer<typeof RegStartDto>) { return this.svc.registerStart(b.id); }
  @Public() @Post('register/finish') regFinish(@Body(zod(RegFinishDto)) b: z.infer<typeof RegFinishDto>) { return this.svc.registerFinish(b.id, b.code, b.password); }
  @ApiBearerAuth() @Post('change-password') change(@Body(zod(ChangeDto)) b: z.infer<typeof ChangeDto>, @CurrentUser() u: AuthUser) { return this.svc.changePassword(u, b.current, b.next); }
}

/** The administrator makes logins, one or many, and sends each person the link to set a password. */
@ApiTags('admin · logins')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/accounts')
export class AccountsController {
  constructor(private svc: AccountsService) {}
  @Get() list(@Query() q: Record<string, string>) { return this.svc.list({ kind: q.kind || undefined, status: q.status || undefined, search: q.q || undefined, role: q.role || undefined, mail: q.mail || undefined }); }
  @Get('summary') summary() { return this.svc.summary(); }
  @Get('roles') roles() { return this.svc.roles(); }
  @Post() create(@Body(zod(CreateDto)) b: z.infer<typeof CreateDto>, @CurrentUser() u: AuthUser) { return this.svc.create(u, b); }
  @Post('bulk') bulk(@Body(zod(BulkDto)) b: z.infer<typeof BulkDto>, @CurrentUser() u: AuthUser) { return this.svc.bulk(u, b); }
  @Post('send-queued') sendQueued() { return this.svc.sendQueued(); }
  @Post('requeue') requeue(@CurrentUser() u: AuthUser) { return this.svc.requeue(u); }
  @Post(':id/invite') invite(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ mode: z.enum(['mail', 'link']) }))) b: { mode: 'mail' | 'link' }, @CurrentUser() u: AuthUser) { return this.svc.reinvite(u, id, b.mode); }
  @Post(':id/email') email(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ email: z.string().trim().email().max(160) }))) b: { email: string }, @CurrentUser() u: AuthUser) { return this.svc.setEmail(u, id, b.email); }
  @Post(':id/status') status(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ active: z.boolean() }))) b: { active: boolean }, @CurrentUser() u: AuthUser) { return this.svc.setActive(u, id, b.active); }
}
