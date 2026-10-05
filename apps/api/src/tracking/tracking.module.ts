import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller.js';
import { TrackingService } from './tracking.service.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({ controllers: [TrackingController, AttendanceController], providers: [TrackingService, AttendanceService] })
export class TrackingModule {}
