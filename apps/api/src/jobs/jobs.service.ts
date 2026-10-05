import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';

/** Scheduled jobs: each one calls a database function from db/migrations/060_hostel_rules.sql. */
@Injectable()
export class JobsService {
  private log = new Logger('jobs');
  constructor(private dbs: DbService) {}

  private async call(fn: string) {
    const [r] = await this.dbs.rows<{ n: number }>(sql.raw(`select ${fn} as n`));
    this.log.log(`${fn} → ${r?.n}`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES) overdueOutpasses() { return this.call('hostel.fn_mark_overdue_outpasses()'); }
  /** Approved passes never used before their return time, and requests not decided by their leaving time, are cancelled. */
  @Cron(CronExpression.EVERY_5_MINUTES) expireOutpasses() { return this.call('hostel.fn_expire_outpasses()'); }
  @Cron(CronExpression.EVERY_HOUR) overdueFees() { return this.call('hostel.fn_mark_overdue_fees()'); }
  @Cron('15 10,15,19,22 * * *', { timeZone: 'Asia/Kolkata' }) missedMeals() { return this.call('hostel.fn_flag_missed_sick_meals()'); }
  /** D6: the mess in-charge gets the sick list before each meal (breakfast, lunch, snacks, dinner). */
  @Cron('0 7 * * *', { timeZone: 'Asia/Kolkata' }) sickBreakfast() { return this.call("hostel.fn_queue_sick_lists('Breakfast')"); }
  @Cron('0 12 * * *', { timeZone: 'Asia/Kolkata' }) sickLunch() { return this.call("hostel.fn_queue_sick_lists('Lunch')"); }
  @Cron('30 16 * * *', { timeZone: 'Asia/Kolkata' }) sickSnacks() { return this.call("hostel.fn_queue_sick_lists('Evening_Snacks')"); }
  @Cron('0 19 * * *', { timeZone: 'Asia/Kolkata' }) sickDinner() { return this.call("hostel.fn_queue_sick_lists('Dinner')"); }
  /** Monday 06:00: last week's floor reports are prepared for the Chief Warden to send to the Dean. */
  @Cron('0 6 * * 1', { timeZone: 'Asia/Kolkata' }) weeklyFloorReports() { return this.call('hostel.fn_build_weekly_floor_reports()'); }
  /** Weekly food choice: changes apply on Monday; on Friday every resident is reminded they may change next week's food. */
  @Cron('5 0 * * 1', { timeZone: 'Asia/Kolkata' }) foodChoices() { return this.call('hostel.fn_apply_food_choices()'); }
  @Cron('0 10 * * 5', { timeZone: 'Asia/Kolkata' }) menuReminders() { return this.call('hostel.fn_queue_menu_reminders()'); }
  // weekly menu choice (MES-09): close weeks whose choices are due and fill in what was not chosen; remind on Wed and Thu
  @Cron('2 * * * *', { timeZone: 'Asia/Kolkata' }) closeWeeklyMenus() { return this.call('hostel.fn_close_weekly_menus()'); }
  @Cron('0 10 * * 3,4', { timeZone: 'Asia/Kolkata' }) mealChoiceReminders() { return this.call('hostel.fn_queue_meal_choice_reminders()'); }
  @Cron('0 2 * * *', { timeZone: 'Asia/Kolkata' }) notSeen() { return this.call('hostel.fn_raise_not_seen_alerts()'); }
  @Cron('30 2 * * *', { timeZone: 'Asia/Kolkata' }) purge() { return this.call('hostel.fn_purge_movement_events()'); }
  @Cron('0 1 1 * *', { timeZone: 'Asia/Kolkata' }) rollup() {
    const prev = new Date(); prev.setDate(0);
    return this.call(`hostel.fn_rollup_meter_month('${prev.toISOString().slice(0, 7)}-01')`);
  }
  // room electricity bills for the month just ended, shared by roommates (ELE-04); after the roll-up above
  @Cron('0 3 1 * *', { timeZone: 'Asia/Kolkata' }) electricityBills() {
    const prev = new Date(); prev.setDate(1); prev.setMonth(prev.getMonth() - 1);
    return this.call(`hostel.fn_generate_electricity_bills('${prev.toISOString().slice(0, 7)}-01')`);
  }

  /** Notification outbox: hand queued rows to the SMS / WhatsApp / e-mail provider. Provider wiring is a deployment task. */
  @Cron(CronExpression.EVERY_MINUTE) async dispatch() {
    const queued = await this.dbs.rows<{ notification_id: number; channel: string }>(sql`select notification_id, channel from shared.notification where delivery_status = 'Queued' order by queued_at limit 100`);
    if (!queued.length) return;
    if (!process.env.SMS_PROVIDER_URL) { this.log.warn(`${queued.length} notifications queued; SMS_PROVIDER_URL not set`); return; }
    for (const n of queued) {
      await this.dbs.db.execute(sql`update shared.notification set delivery_status = 'Sent', sent_at = now() where notification_id = ${n.notification_id}`);
    }
  }
}
