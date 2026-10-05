import { Module } from '@nestjs/common';
import { OutpassController } from './outpass.controller.js';
import { OutpassService } from './outpass.service.js';

@Module({ controllers: [OutpassController], providers: [OutpassService] })
export class OutpassModule {}
