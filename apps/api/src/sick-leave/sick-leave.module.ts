import { Module } from '@nestjs/common';
import { SickLeaveController } from './sick-leave.controller.js';
import { SickLeaveService } from './sick-leave.service.js';

@Module({ controllers: [SickLeaveController], providers: [SickLeaveService] })
export class SickLeaveModule {}
