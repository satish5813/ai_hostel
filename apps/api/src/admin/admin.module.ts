import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { SetupController } from './setup.controller.js';
import { SetupService } from './setup.service.js';
import { ImportController } from './import.controller.js';
import { ImportService } from './import.service.js';
import { DataController } from './data.controller.js';
import { DataService } from './data.service.js';
import { PortalController } from './portal.controller.js';
import { PortalService } from './portal.service.js';

@Module({ controllers: [AdminController, SetupController, ImportController, DataController, PortalController], providers: [AdminService, SetupService, ImportService, DataService, PortalService] })
export class AdminModule {}
