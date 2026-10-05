import { Module } from '@nestjs/common';
import { MessOpsController } from './messops.controller.js';
import { MessOpsService } from './messops.service.js';

@Module({ controllers: [MessOpsController], providers: [MessOpsService] })
export class MessOpsModule {}
