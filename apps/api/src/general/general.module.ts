import { Module } from '@nestjs/common';
import { GeneralController } from './general.controller.js';
import { GeneralService } from './general.service.js';

@Module({ controllers: [GeneralController], providers: [GeneralService] })
export class GeneralModule {}
