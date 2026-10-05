import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExecService } from './exec.service.js';
import { Roles } from '../auth/decorators.js';

/** Who sees the executive dashboard (EXE-01). */
export const EXECUTIVES = ['President', 'Vice_President', 'Pro_VC', 'Pro_VC_Finance', 'Pro_VC_Academics', 'Vice_Chancellor', 'authority', 'admin'];

@ApiTags('EXE · executive dashboard')
@ApiBearerAuth()
@Controller('exec')
export class ExecController {
  constructor(private svc: ExecService) {}
  @Roles(...EXECUTIVES) @Get('overview') overview() { return this.svc.overview(); }
  @Roles(...EXECUTIVES) @Get('buildings/:id') building(@Param('id') id: string) { return this.svc.building(id); }
}
