import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller.js';
import { RegistrationService } from './registration.service.js';
import { AllotmentController } from './allotment.controller.js';
import { AllotmentService } from './allotment.service.js';
import { RenewalController } from './renewal.controller.js';
import { RenewalService } from './renewal.service.js';
import { MastersModule } from '../masters/masters.module.js';

@Module({ imports: [MastersModule], controllers: [RegistrationController, AllotmentController, RenewalController], providers: [RegistrationService, AllotmentService, RenewalService], exports: [RegistrationService] })
export class RegistrationModule {}
