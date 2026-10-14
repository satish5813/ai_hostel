import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { t } from '@klu/db';
import { DbService } from '../db/db.service.js';
import { MastersService } from '../masters/masters.service.js';
import { assertScope, facWhere } from '../auth/scope.js';
import { exceptionNeeded, isChiefWarden } from '../cw/rules.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * Workflow A — Applied > Registration fee paid > Room allotted > Room accepted > Fees paid > Checked in.
 * The database raises the demands, holds the bed, derives Amount_Paid and moves the status; this service
 * only writes the facts each actor supplies.
 */
@Injectable()
export class RegistrationService {
  constructor(private dbs: DbService, private masters: MastersService) {}
  private get db() { return this.dbs.db; }

  async apply(user: AuthUser, dto: { student_id?: string; facility_id: string; room_type_id: number; academic_year?: string; rules_accepted: boolean }) {
    const studentId = user.kind === 'student' ? user.id : dto.student_id;
    if (!studentId) throw new UnprocessableEntityException('student_id is required for office entry');
    const year = dto.academic_year ?? (await this.masters.currentYear()).academic_year;
    const [row] = await this.dbs.run(user, (tx) => tx.insert(t.registration).values({
      student_id: studentId, academic_year: year, facility_id: dto.facility_id, room_type_id: dto.room_type_id,
      rules_accepted: dto.rules_accepted, created_by: user.id,
    }).returning());
    return this.get(row.registration_id, user);
  }

  async get(id: number, user: AuthUser) {
    const [r] = await this.db.select().from(t.vRegistration).where(eq(t.vRegistration.registration_id, id));
    if (!r) throw new NotFoundException('Registration not found');
    if (user.kind === 'student' && r.student_id !== user.id) throw new ForbiddenException('Own registration only');
    const offers = await this.db.select().from(t.roomOffer).where(eq(t.roomOffer.registration_id, id)).orderBy(t.roomOffer.offer_no);
    const demands = await this.db.select().from(t.feeDemand).where(eq(t.feeDemand.student_id, r.student_id!)).orderBy(t.feeDemand.due_date);
    return { ...r, offers, demands };
  }

  /** v_registration with every column (the generated schema predates the fee check), ids as numbers. */
  private regRows(where: ReturnType<typeof sql>) {
    return this.dbs.rows<Record<string, unknown>>(sql`select to_jsonb(v) || jsonb_build_object('registration_id', v.registration_id::int, 'offer_id', v.offer_id::int, 'hostel_alloc_id', v.hostel_alloc_id::int, 'fee_plan_id', v.fee_plan_id::int,
        'registration_fee', v.registration_fee::text, 'plan_amount_due', v.plan_amount_due::text, 'plan_amount_paid', v.plan_amount_paid::text,
        'renewal_of', (select h.renewal_of::int from hostel.hostel_registration h where h.registration_id = v.registration_id)) as r
      from hostel.v_registration v where ${where} order by v.applied_on desc limit 500`).then((rows) => rows.map((x) => x.r as Record<string, unknown>));
  }

  mine(user: AuthUser) {
    return this.regRows(sql`v.student_id = ${user.id}`);
  }

  list(q: { facility_id?: string; status?: string; academic_year?: string }, user?: AuthUser) {
    return this.regRows(sql`${facWhere('v.facility_id', q.facility_id, user)}
      and (${q.status ?? null}::varchar is null or v.status::text = ${q.status ?? null}) and (${q.academic_year ?? null}::varchar is null or v.academic_year = ${q.academic_year ?? null})`);
  }

  /** Allotment desk: offer a bed. Without subspace_id the first suitable vacant bed is chosen (accessible room first for a student with a disability). */
  async offer(user: AuthUser, registrationId: number, subspaceId?: string) {
    const [reg] = await this.dbs.rows<{ facility_id: string }>(sql`select facility_id from hostel.hostel_registration where registration_id = ${registrationId}`);
    assertScope(user, reg?.facility_id);
    // a bed outside the rules needs the Chief Manager (CW-03); the Chief Manager at the desk decides it at once, on record
    if (subspaceId && user.kind === 'staff') {
      const need = await exceptionNeeded(this.dbs, registrationId, subspaceId);
      if (need) {
        if (!isChiefWarden(user)) throw new ConflictException({ message: `Needs the Chief Manager: ${need.text}`, kind: need.kind, needs_cw: true });
        return this.dbs.run(user, async (tx) => {
          const [e] = (await tx.execute(sql`insert into hostel.allotment_exception (kind, facility_id, registration_id, subspace_id, reason, requested_by, created_by)
            values (${need.kind}::hostel.exception_kind, ${reg!.facility_id}, ${registrationId}, ${subspaceId}, ${'Offered by the Chief Manager at the desk: ' + need.text}, ${user.id}, ${user.id}) returning exception_id`)) as unknown as { exception_id: number }[];
          await tx.execute(sql`update hostel.allotment_exception set status = 'Approved', decided_by = ${user.id}, decision_remarks = 'Decided by the Chief Manager when offering', updated_by = ${user.id} where exception_id = ${e.exception_id}`);
          const [o] = (await tx.execute(sql`select o.* from hostel.room_offer o join hostel.allotment_exception e on e.offer_id = o.offer_id where e.exception_id = ${e.exception_id}`)) as unknown as Record<string, unknown>[];
          return o;
        });
      }
    }
    return this.dbs.run(user, async (tx) => {
      let bed = subspaceId;
      if (!bed) {
        const [pick] = await tx.execute(sql`
          select b.subspace_id from hostel.v_bed b
          join hostel.hostel_registration r on r.registration_id = ${registrationId}
          join ref.student_master sm on sm.student_id = r.student_id
          where b.facility_id = r.facility_id and b.room_type_id = r.room_type_id and b.bed_status = 'Vacant'
            and b.room_status <> 'Under_Maintenance' and b.reserved_for = 'None' and not b.is_blocked
          order by (sm.disability is not null and sm.disability <> 'NA' and b.is_accessible) desc, b.floor_no, b.room_code, b.bed_code limit 1`) as unknown as { subspace_id: string }[];
        if (!pick) {
          // no bed: put on the waitlist
          const [wl] = await tx.execute(sql`select coalesce(max(waitlist_no),0)+1 as n from hostel.hostel_registration r2 join hostel.hostel_registration r on r.registration_id = ${registrationId}
             where r2.facility_id = r.facility_id and r2.room_type_id = r.room_type_id and r2.academic_year = r.academic_year and r2.status = 'Waitlisted'`) as unknown as { n: number }[];
          await tx.update(t.registration).set({ status: 'Waitlisted', waitlist_no: Number(wl.n), updated_by: user.id }).where(eq(t.registration.registration_id, registrationId));
          return { waitlisted: true, waitlist_no: Number(wl.n) };
        }
        bed = pick.subspace_id;
      }
      const [o] = await tx.insert(t.roomOffer).values({
        registration_id: registrationId, subspace_id: bed, offer_no: 0, hold_until: new Date().toISOString(),
        offered_by: user.kind === 'staff' ? user.id : null, created_by: user.id,
      }).returning();
      return o;
    });
  }

  async decide(user: AuthUser, offerId: number, decision: 'Accepted' | 'Declined', reason?: string) {
    const [o] = await this.db.select({ student_id: t.registration.student_id }).from(t.roomOffer)
      .innerJoin(t.registration, eq(t.registration.registration_id, t.roomOffer.registration_id)).where(eq(t.roomOffer.offer_id, offerId));
    if (!o) throw new NotFoundException('Offer not found');
    if (user.kind === 'student' && o.student_id !== user.id) throw new ForbiddenException('Own offer only');
    const [row] = await this.dbs.run(user, (tx) => tx.update(t.roomOffer)
      .set({ student_decision: decision, decline_reason: reason ?? null, updated_by: user.id })
      .where(eq(t.roomOffer.offer_id, offerId)).returning());
    return row;
  }

  /** Student chooses single payment or two instalments and the mess cuisine; the DB creates the hostel demands. */
  async feePlan(user: AuthUser, registrationId: number, dto: { plan_type: 'Single' | 'Two_Instalments'; mess_id?: number; cuisine?: string; region?: string; diet?: string; country?: string }) {
    // region + diet is the real choice; cuisine (the older single value) is derived from it for the rows that still read it
    if (dto.region && !dto.cuisine) dto.cuisine = dto.region === 'North' ? 'North_Indian' : dto.region === 'International' ? 'Special_Diet' : dto.diet === 'Non_Veg' ? 'Non_Veg' : 'South_Indian';
    if (dto.cuisine && !dto.region) { dto.region = dto.cuisine === 'North_Indian' ? 'North' : dto.cuisine === 'Special_Diet' ? 'International' : 'South'; dto.diet ??= dto.cuisine === 'Non_Veg' ? 'Non_Veg' : 'Veg'; }
    return this.dbs.run(user, async (tx) => {
      const [r] = await tx.select().from(t.registration).where(eq(t.registration.registration_id, registrationId));
      if (!r) throw new NotFoundException('Registration not found');
      if (user.kind === 'student' && r.student_id !== user.id) throw new ForbiddenException('Own registration only');
      const [fee] = await tx.select().from(t.roomTypeFee).where(and(
        eq(t.roomTypeFee.facility_id, r.facility_id), eq(t.roomTypeFee.room_type_id, r.room_type_id), eq(t.roomTypeFee.academic_year, r.academic_year)));
      if (!fee) throw new UnprocessableEntityException('No fee defined for this hostel, room type and year');
      const [plan] = await tx.insert(t.feePlan).values({ registration_id: registrationId, plan_type: dto.plan_type, fee_id: fee.fee_id, created_by: user.id }).returning();

      let subscription = null;
      if (dto.cuisine) {
        const messId = dto.mess_id ?? (await tx.select({ m: t.hostelProfile.default_mess_id }).from(t.hostelProfile).where(eq(t.hostelProfile.facility_id, r.facility_id)))[0]?.m;
        if (!messId) throw new UnprocessableEntityException('No mess for this hostel; pass mess_id');
        const [mess] = await tx.select().from(t.messMaster).where(eq(t.messMaster.mess_id, messId));
        const [demand] = await tx.insert(t.feeDemand).values({
          student_id: r.student_id, fee_plan_id: plan.fee_plan_id, fee_head: 'Mess', instalment_no: 1,
          amount_due: String(mess?.annual_fee ?? 0), due_date: sql`current_date + hostel.fn_policy_days('instalment_1_due_days', 7)` as never,
          reference_type: 'mess_subscription', created_by: user.id,
        }).returning();
        [subscription] = await tx.insert(t.messSubscription).values({
          student_id: r.student_id, mess_id: messId, academic_year: r.academic_year, cuisine: dto.cuisine as never, mess_demand_id: demand.demand_id, created_by: user.id,
        }).returning();
        await tx.execute(sql`update hostel.mess_subscription set region = ${dto.region ?? 'South'}, diet = ${dto.diet ?? 'Veg'}, country = ${dto.country ?? null} where subscription_id = ${subscription!.subscription_id}`);
      }
      const demands = await tx.select().from(t.feeDemand).where(eq(t.feeDemand.fee_plan_id, plan.fee_plan_id));
      return { plan, demands, subscription };
    });
  }

  async demands(user: AuthUser, studentId: string) {
    if (user.kind === 'student' && user.id !== studentId) throw new ForbiddenException('Own dues only');
    if (user.kind === 'parent') {
      const [c] = await this.dbs.rows<{ student_id: string }>(sql`select student_id from hostel.student_contact where contact_id = ${Number(user.id.replace('contact:', ''))} and is_verified`);
      if (c?.student_id !== studentId) throw new ForbiddenException('Own child only');
    }
    const demands = await this.db.select().from(t.feeDemand).where(eq(t.feeDemand.student_id, studentId)).orderBy(t.feeDemand.due_date);
    const totals = await this.db.select().from(t.vStudentDues).where(eq(t.vStudentDues.student_id, studentId));
    const receipts = await this.dbs.rows(sql`select r.receipt_id::int as receipt_id, r.receipt_no, r.demand_id::int as demand_id, d.fee_head, d.instalment_no, d.reference_type, r.amount, r.paid_on, r.payment_mode, r.gateway_ref, r.gateway_status, r.collected_by
      from hostel.fee_receipt r join hostel.fee_demand d on d.demand_id = r.demand_id where d.student_id = ${studentId} order by r.paid_on desc`);
    return { demands, totals, receipts };
  }

  /** Accounts desk: cash or DD receipt (online receipts come from the payment webhook). */
  cashReceipt(user: AuthUser, demandId: number, dto: { amount: number; payment_mode: 'Cash' | 'DD'; reference?: string }) {
    return this.dbs.run(user, async (tx) => {
      const [row] = await tx.insert(t.feeReceipt).values({
        demand_id: demandId, amount: String(dto.amount), payment_mode: dto.payment_mode, gateway_ref: dto.reference ?? null,
        gateway_status: 'Success', collected_by: user.id, created_by: user.id,
      }).returning();
      return row;
    });
  }

  /** Office: check-in. The accepted offer becomes the stay; bed, student flag, meter map and status follow in the DB. */
  checkIn(user: AuthUser, dto: { offer_id: number; key_no: string; approved_by?: string }) {
    return this.dbs.run(user, async (tx) => {
      const [o] = await tx.select({ subspace_id: t.roomOffer.subspace_id, student_id: t.registration.student_id, academic_year: t.registration.academic_year, facility_id: t.registration.facility_id })
        .from(t.roomOffer).innerJoin(t.registration, eq(t.registration.registration_id, t.roomOffer.registration_id)).where(eq(t.roomOffer.offer_id, dto.offer_id));
      if (!o) throw new NotFoundException('Offer not found');
      assertScope(user, o.facility_id);
      const [row] = await tx.insert(t.allocation).values({
        occupant_type: 'Student', student_id: o.student_id, subspace_id: o.subspace_id, offer_id: dto.offer_id, academic_year: o.academic_year,
        key_no: dto.key_no, checked_in_by: user.id, approved_by: dto.approved_by ?? null, created_by: user.id,
      }).returning();
      return row;
    });
  }

  /** Floor Manager / Office: check-in or check-out inspection with the room item list. */
  handover(user: AuthUser, allocId: number, dto: {
    handover_type: 'Check_In' | 'Check_Out'; meter_reading: number; key_returned?: boolean; vacate_id?: number; occupant_acknowledged: boolean;
    lines: { asset_id: string; condition: 'Good' | 'Fair' | 'Damaged' | 'Missing'; damage_amount?: number; remarks?: string }[];
  }) {
    return this.dbs.run(user, async (tx) => {
      const [h] = await tx.insert(t.handover).values({
        hostel_alloc_id: allocId, handover_type: dto.handover_type, meter_reading: String(dto.meter_reading), key_returned: dto.key_returned ?? null,
        vacate_id: dto.vacate_id ?? null, done_by: user.id, occupant_acknowledged: dto.occupant_acknowledged, created_by: user.id,
      }).returning();
      if (dto.lines.length) {
        await tx.insert(t.handoverLine).values(dto.lines.map((l, i) => ({
          handover_id: h.handover_id, line_no: i + 1, asset_id: l.asset_id, condition: l.condition, damage_amount: String(l.damage_amount ?? 0), remarks: l.remarks ?? null,
        })));
      }
      const [final] = await tx.select().from(t.handover).where(eq(t.handover.handover_id, h.handover_id));
      return final;
    });
  }

  async allocation(id: number, user: AuthUser) {
    const [a] = await this.db.select().from(t.allocation).where(eq(t.allocation.hostel_alloc_id, id));
    if (!a) throw new NotFoundException('Allocation not found');
    if (user.kind === 'student' && a.student_id !== user.id) throw new ForbiddenException('Own stay only');
    const [bed] = await this.db.select().from(t.vBed).where(eq(t.vBed.subspace_id, a.subspace_id));
    const handovers = await this.db.select().from(t.handover).where(eq(t.handover.hostel_alloc_id, id));
    return { ...a, bed, handovers };
  }
}
