import { Module } from '@nestjs/common';
import { AcadController } from './acad.controller.js';
import { AcadService } from './acad.service.js';

@Module({ controllers: [AcadController], providers: [AcadService] })
export class AcadModule {}
