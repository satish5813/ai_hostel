import { Module } from '@nestjs/common';
import { CautionController } from './caution.controller.js';
import { CautionService } from './caution.service.js';

@Module({ controllers: [CautionController], providers: [CautionService] })
export class CautionModule {}
