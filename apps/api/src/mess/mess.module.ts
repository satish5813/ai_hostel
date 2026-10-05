import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { WeeklyMenuController } from './weekly.controller.js';
import { WeeklyMenuService } from './weekly.service.js';
import { SentimentController } from './sentiment.controller.js';
import { SentimentService } from './sentiment.service.js';

@Module({ controllers: [MenuController, WeeklyMenuController, SentimentController], providers: [MenuService, WeeklyMenuService, SentimentService] })
export class MessModule {}
