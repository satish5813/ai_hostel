import { Module } from '@nestjs/common';
import { FloorController } from './floor.controller.js';
import { FloorService } from './floor.service.js';
import { WorkService } from './work.service.js';

@Module({ controllers: [FloorController], providers: [FloorService, WorkService] })
export class FloorModule {}
