import { Module } from '@nestjs/common';
import { RepairsController } from './repairs.controller.js';
import { RepairsService } from './repairs.service.js';
import { ElectricityService } from './electricity.service.js';

@Module({ controllers: [RepairsController], providers: [RepairsService, ElectricityService], exports: [RepairsService, ElectricityService] })
export class RepairsModule {}
