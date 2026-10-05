import { Module } from '@nestjs/common';
import { DeanController } from './dean.controller.js';
import { DeanService } from './dean.service.js';

@Module({ controllers: [DeanController], providers: [DeanService] })
export class DeanModule {}
