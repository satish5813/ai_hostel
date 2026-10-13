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
import { AccountsController, AuthController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';

@Module({ controllers: [AdminController, SetupController, ImportController, DataController, PortalController, AuthController, AccountsController], providers: [AdminService, SetupService, ImportService, DataService, PortalService, AccountsService] })
export class AdminModule {}
