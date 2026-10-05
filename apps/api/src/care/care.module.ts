import { Module } from '@nestjs/common';
import { CareController } from './care.controller.js';
import { CareService } from './care.service.js';

@Module({ controllers: [CareController], providers: [CareService] })
export class CareModule {}
