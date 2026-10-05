import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { t } from '@klu/db';
import { DbService } from '../db/db.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Workflow C — meter fixed to room > mapped at check-in > readings > limit reached > online recharge > final reading. */
@Injectable()
export class MeterService {
  constructor(private dbs: DbService, private payments: PaymentsService) {}
  private get db() { return this.dbs.db; }

  positions(facilityId?: string) {
    return this.dbs.rows(sql`
      select p.*, b.hostel_name, b.floor_name, b.room_code
      from hostel.v_meter_position p
      join lateral (select hostel_name, floor_name, room_code, facility_id from hostel.v_bed b where b.space_id = p.space_id limit 1) b on true
      ${facilityId ? sql`where b.facility_id = ${facilityId}` : sql``}
      order by b.floor_name, b.room_code`);
  }

  /** the student's own room meter */
  async mine(user: AuthUser) {
    const [stay] = await this.dbs.rows<{ space_id: string }>(sql`select * from hostel.fn_student_stay(${user.id})`);
    if (!stay?.space_id) throw new NotFoundException('No current stay');
    const [pos] = await this.db.select().from(t.vMeterPosition).where(eq(t.vMeterPosition.space_id, stay.space_id));
    if (!pos) throw new NotFoundException('No active meter in your room');
    const recharges = await this.db.select().from(t.meterRecharge).where(eq(t.meterRecharge.meter_id, pos.meter_id!)).orderBy(desc(t.meterRecharge.created_at)).limit(20);
    const monthly = await this.db.select().from(t.meterMonthlyUsage).where(eq(t.meterMonthlyUsage.meter_id, pos.meter_id!)).orderBy(desc(t.meterMonthlyUsage.usage_month)).limit(12);
    return { ...pos, recharges, monthly };
  }

  register(user: AuthUser, dto: { space_id: string; meter_no: string; meter_type: 'Smart_Prepaid' | 'Manual'; device_ref?: string; installed_on: string; asset_id?: string }) {
    return this.dbs.run(user, (tx) => tx.insert(t.roomMeter).values({ ...dto, device_ref: dto.device_ref ?? null, asset_id: dto.asset_id ?? null, created_by: user.id }).returning());
  }

  setStatus(user: AuthUser, meterId: number, status: 'Active' | 'Faulty' | 'Replaced') {
    return this.dbs.run(user, (tx) => tx.update(t.roomMeter).set({ status, updated_by: user.id }).where(eq(t.roomMeter.meter_id, meterId)).returning());
  }

  reading(user: AuthUser, meterId: number, dto: { reading_kwh: number; reading_at?: string; source?: 'Auto' | 'Manual' }) {
    const source = dto.source ?? (user.kind === 'system' ? 'Auto' : 'Manual');
    return this.dbs.run(user, (tx) => tx.insert(t.meterReading).values({
      meter_id: meterId, reading_kwh: String(dto.reading_kwh), reading_at: dto.reading_at ?? new Date().toISOString(), source,
      read_by: source === 'Manual' ? user.id : null, created_by: user.id,
    }).returning());
  }

  readings(meterId: number, limit = 100) {
    return this.db.select().from(t.meterReading).where(eq(t.meterReading.meter_id, meterId)).orderBy(desc(t.meterReading.reading_at)).limit(limit);
  }

  /** Student pays for extra units: an Electricity demand is raised and a payment order returned; the webhook credits the meter. */
  async recharge(user: AuthUser, meterId: number, amount: number) {
    const [open] = await this.dbs.rows<{ student_id: string }>(sql`
      select a.student_id from hostel.meter_student_map m join hostel.hostel_allocation a using (hostel_alloc_id)
      where m.meter_id = ${meterId} and m.to_datetime is null and a.student_id = ${user.id}`);
    if (user.kind === 'student' && !open) throw new ForbiddenException('This meter is not mapped to you');
    if (amount < 50) throw new UnprocessableEntityException('Minimum recharge is ₹50');
    const [demand] = await this.dbs.run(user, (tx) => tx.insert(t.feeDemand).values({
      student_id: user.id, fee_head: 'Electricity', amount_due: String(amount), due_date: new Date().toISOString().slice(0, 10),
      reference_type: 'meter_recharge', reference_id: meterId, created_by: user.id,
    }).returning());
    const order = await this.payments.createOrder(user, demand.demand_id);
    return { demand, order };
  }

  tariffs() { return this.db.select().from(t.tariff).orderBy(t.tariff.room_type_id, desc(t.tariff.effective_from)); }
  approveTariff(user: AuthUser, tariffId: number) {
    return this.dbs.run(user, async (tx) => {
      const [row] = await tx.update(t.tariff).set({ approved_by: user.id, updated_by: user.id }).where(and(eq(t.tariff.tariff_id, tariffId), sql`approved_by is null`)).returning();
      if (!row) throw new NotFoundException('No unapproved tariff with that id');
      return row;
    });
  }

  setTariff(user: AuthUser, dto: { room_type_id: number; included_units_per_month: number; rate_per_unit: number; effective_from: string }) {
    return this.dbs.run(user, async (tx) => {
      // close the current rate the day before the new one starts
      await tx.update(t.tariff).set({ effective_to: sql`${dto.effective_from}::date - 1`, updated_by: user.id })
        .where(and(eq(t.tariff.room_type_id, dto.room_type_id), sql`effective_to is null`, sql`effective_from < ${dto.effective_from}::date`));
      const [row] = await tx.insert(t.tariff).values({
        room_type_id: dto.room_type_id, included_units_per_month: String(dto.included_units_per_month), rate_per_unit: String(dto.rate_per_unit),
        effective_from: dto.effective_from, approved_by: null, created_by: user.id,
      }).returning();
      return row;
    });
  }

  monthly(meterId: number) { return this.db.select().from(t.meterMonthlyUsage).where(eq(t.meterMonthlyUsage.meter_id, meterId)).orderBy(desc(t.meterMonthlyUsage.usage_month)); }

  /** Smart-meter vendor push (stub): called by the push worker after the vendor API confirms. */
  confirmPush(user: AuthUser, rechargeId: number, pushRef: string, ok: boolean) {
    return this.dbs.run(user, (tx) => tx.update(t.meterRecharge)
      .set({ pushed_to_meter: ok, push_ref: pushRef, status: ok ? 'Credited' : 'Failed', push_attempts: sql`push_attempts + 1`, updated_by: user.id })
      .where(eq(t.meterRecharge.recharge_id, rechargeId)).returning());
  }
}
