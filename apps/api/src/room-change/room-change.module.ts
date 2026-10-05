import { Module } from '@nestjs/common';
import { RoomChangeController } from './room-change.controller.js';
import { RoomChangeService } from './room-change.service.js';

@Module({ controllers: [RoomChangeController], providers: [RoomChangeService] })
export class RoomChangeModule {}
