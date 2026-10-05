import { Module } from '@nestjs/common';
import { CwController } from './cw.controller.js';
import { CwService } from './cw.service.js';

@Module({ controllers: [CwController], providers: [CwService] })
export class CwModule {}
