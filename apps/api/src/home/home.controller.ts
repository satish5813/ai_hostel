import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HomeService } from './home.service.js';
import { CurrentUser } from '../auth/decorators.js';
import type { AuthUser } from '../auth/auth.types.js';

@ApiTags('home: apps launcher')
@ApiBearerAuth()
@Controller()
export class HomeController {
  constructor(private svc: HomeService) {}
  @Get('home/summary') summary(@CurrentUser() u: AuthUser, @Query('facility_id') f?: string) { return this.svc.summary(u, f || undefined); }
}
