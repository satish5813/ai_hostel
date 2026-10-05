import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { LinksService } from './links.service.js';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const ActDto = z.object({ decision: z.enum(['Approved', 'Rejected']), remarks: z.string().max(500).optional() });

@ApiTags('E · one-time approval links (parent, Dean)')
@Controller()
export class LinksController {
  constructor(private svc: LinksService) {}
  @Public() @Get('links/:token') view(@Param('token') token: string) { return this.svc.view(token); }
  @Public() @Post('links/:token') act(@Param('token') token: string, @Body(zod(ActDto)) b: z.infer<typeof ActDto>) { return this.svc.act(token, b.decision, b.remarks); }
  @Roles('Chief_Warden', 'Director_Hostels') @Post('outpasses/:id/resend-link') resend(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.resend(u, id); }
}
