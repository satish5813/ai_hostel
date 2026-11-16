import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from './db/db.module.js';
import { AuthGuard } from './auth/auth.guard.js';
import { DemoLoginController } from './auth/demo-login.controller.js';
import { RolesGuard } from './auth/roles.guard.js';
import { ScopeGuard } from './auth/scope.js';
import { MastersModule } from './masters/masters.module.js';
import { RegistrationModule } from './registration/registration.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { MappingModule } from './mapping/mapping.module.js';
import { MeterModule } from './meter/meter.module.js';
import { TrackingModule } from './tracking/tracking.module.js';
import { ApprovalsModule } from './approvals/approvals.module.js';
import { OutpassModule } from './outpass/outpass.module.js';
import { SickLeaveModule } from './sick-leave/sick-leave.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { GeneralModule } from './general/general.module.js';
import { AdminModule } from './admin/admin.module.js';
import { RosterModule } from './roster/roster.module.js';
import { FloorModule } from './floor/floor.module.js';
import { AcadModule } from './acad/acad.module.js';
import { AccessModule } from './access/access.module.js';
import { HomeModule } from './home/home.module.js';
import { DbxModule } from './dbx/dbx.module.js';
import { LinksModule } from './links/links.module.js';
import { CwModule } from './cw/cw.module.js';
import { MessModule } from './mess/mess.module.js';
import { ExecModule } from './exec/exec.module.js';
import { DownloadsModule } from './downloads/downloads.module.js';
import { CareerModule } from './career/career.module.js';
import { RepairsModule } from './repairs/repairs.module.js';
import { HealthModule } from './health/health.module.js';
import { RoomChangeModule } from './room-change/room-change.module.js';
import { CautionModule } from './caution/caution.module.js';
import { OpsModule } from './ops/ops.module.js';
import { MessOpsModule } from './messops/messops.module.js';
import { CareModule } from './care/care.module.js';
import { DeanModule } from './dean/dean.module.js';
import { WalletModule } from './wallet/wallet.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ScheduleModule.forRoot(),
    DbModule,
    MastersModule,
    RegistrationModule,
    PaymentsModule,
    MappingModule,
    RosterModule,
    FloorModule,
    AcadModule,
    AccessModule,
    HomeModule,
    DbxModule,
    LinksModule,
    CwModule,
    MessModule,
    ExecModule,
    DownloadsModule,
    CareerModule,
    RepairsModule,
    HealthModule,
    RoomChangeModule,
    CautionModule,
    OpsModule,
    MessOpsModule,
    CareModule,
    DeanModule,
    MeterModule,
    TrackingModule,
    ApprovalsModule,
    OutpassModule,
    SickLeaveModule,
    JobsModule,
    WalletModule,
    GeneralModule,
    AdminModule,
  ],
  controllers: [DemoLoginController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },
  ],
})
export class AppModule {}
