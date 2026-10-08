import { Module } from '@nestjs/common';
import { DbxController } from './dbx.controller.js';
import { DbxService } from './dbx.service.js';

@Module({ controllers: [DbxController], providers: [DbxService] })
export class DbxModule {}
