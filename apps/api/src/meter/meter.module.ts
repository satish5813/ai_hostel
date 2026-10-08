import { Module } from '@nestjs/common';
import { MeterController } from './meter.controller.js';
import { MeterService } from './meter.service.js';
import { PaymentsModule } from '../payments/payments.module.js';

@Module({ imports: [PaymentsModule], controllers: [MeterController], providers: [MeterService] })
export class MeterModule {}
