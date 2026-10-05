import { Module } from '@nestjs/common';
import { ExecController } from './exec.controller.js';
import { ExecService } from './exec.service.js';
import { CareerModule } from '../career/career.module.js';
import { RepairsModule } from '../repairs/repairs.module.js';

@Module({ imports: [CareerModule, RepairsModule], controllers: [ExecController], providers: [ExecService] })
export class ExecModule {}
