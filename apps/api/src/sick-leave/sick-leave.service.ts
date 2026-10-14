import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { t } from '@klu/db';
import { DbService } from '../db/db.service.js';
import { assertScope, facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Workflow F — apply > Floor Manager verifies in person > Chief Manager approves > mess sick list > food to the room > leave ends. */
@Injectable()
export class SickLeaveService {
  constructor(private dbs: DbService) {}
  private get db() { return this.dbs.db; }

  async apply(user: AuthUser, dto: { illness_details: string; from_date: string; to_date: string; medical_doc_id?: string; extended_from_id?: number }) {
    if (user.kind !== 'student') throw new ForbiddenException('Students apply for their own leave');
    const [row] = await this.dbs.run(user, (tx) => tx.insert(t.sickLeave).values({
      student_id: user.id, illness_details: dto.illness_details, from_date: dto.from_date, to_date: dto.to_date,
      medical_doc_id: dto.medical_doc_id ?? null, extended_from_id: dto.extended_from_id ?? null, created_by: user.id,
    }).returning());
    return row;
  }

  async get(id: number, user: AuthUser) {
    const [l] = await this.db.select().from(t.sickLeave).where(eq(t.sickLeave.sick_leave_id, id));
    if (!l) throw new NotFoundException('Sick leave not found');
    if (user.kind === 'student' && l.student_id !== user.id) throw new ForbiddenException('Own leave only');
    const deliveries = await this.db.select().from(t.sickMealDelivery).where(eq(t.sickMealDelivery.sick_leave_id, id)).orderBy(t.sickMealDelivery.meal_date, t.sickMealDelivery.slot);
    const steps = await this.dbs.rows(sql`select s.*, initcap(st.full_name) as acted_by_name, r.step_name from shared.approval_step s left join ref.staff_master st on st.staff_id = s.acted_by
      left join shared.approval_rule r on r.rule_id = s.rule_id where s.request_type = 'Sick_Leave' and s.request_id = ${id} order by s.level`);
    const [diet] = await this.dbs.rows<{ diet: string; diet_note: string | null }>(sql`select diet, diet_note from hostel.sick_leave where sick_leave_id = ${id}`);
    return { ...l, ...diet, deliveries, steps };
  }

  /** The student's own leave, with the diet and who has approved so far. */
  mine(user: AuthUser) {
    return this.dbs.rows(sql`select l.*, (select coalesce(json_agg(json_build_object('level', s.level, 'approver_role', s.approver_role, 'decision', s.decision, 'decided_on', s.decided_on,
        'acted_by_name', initcap(st.full_name), 'remarks', s.remarks) order by s.level), '[]') from shared.approval_step s left join ref.staff_master st on st.staff_id = s.acted_by
        where s.request_type = 'Sick_Leave' and s.request_id = l.sick_leave_id) as steps
      from hostel.sick_leave l where l.student_id = ${user.id} order by l.applied_on desc`);
  }

  list(q: { facility_id?: string; status?: string }, user?: AuthUser) {
    return this.dbs.rows(sql`
      select l.*, sm.full_name, st.facility_id, b.hostel_name, b.floor_name, b.room_code,
        (select s.approver_role from shared.approval_step s where s.request_type = 'Sick_Leave' and s.request_id = l.sick_leave_id and s.decision = 'Pending' order by s.level limit 1) as waiting_for
      from hostel.sick_leave l join ref.student_master sm using (student_id)
      left join hostel.fn_student_stay(l.student_id) st on true left join hostel.v_bed b on b.subspace_id = st.subspace_id
      where ${facWhere('st.facility_id', q.facility_id, user)}
        and (${q.status ?? null}::text is null or l.status::text = ${q.status ?? null})
      order by l.applied_on desc limit 500`);
  }

  /**
   * The in-person visit (decision D4). The Chief Manager records who visited, when and what they found; a Floor Manager
   * may still record their own visit. The Chief Manager then approves through /approvals.
   */
  async visit(user: AuthUser, id: number, dto: { visit_remarks: string; visited_by?: string; visited_at?: string; diet?: 'Light' | 'Liquid' | 'Normal'; diet_note?: string | null }) {
    const [l] = await this.dbs.rows<{ status: string; applied_on: string; facility_id: string | null; floor_warden: string | null }>(sql`
      select l.status::text as status, l.applied_on, st.facility_id, hostel.fn_find_approver(l.student_id, 'Floor_Warden') as floor_warden
      from hostel.sick_leave l left join hostel.fn_student_stay(l.student_id) st on true where l.sick_leave_id = ${id}`);
    if (!l) throw new NotFoundException('Sick leave not found');
    assertScope(user, l.facility_id);
    if (!['Applied', 'Recommended'].includes(l.status)) throw new UnprocessableEntityException(`This leave is ${l.status}`);
    const byCw = user.roles.includes('Chief_Warden') || user.roles.includes('Director_Hostels');
    const visitor = byCw ? (dto.visited_by || l.floor_warden || user.id) : user.id;
    if (byCw && visitor !== user.id) {
      const [ok] = await this.dbs.rows(sql`select 1 from hostel.staff_space_assignment where staff_id = ${visitor} and facility_id = ${l.facility_id} and status = 'Active'`);
      if (!ok) throw new UnprocessableEntityException(`${visitor} does not work in this hostel`);
    }
    const at = dto.visited_at ? new Date(dto.visited_at) : new Date();
    if (Number.isNaN(+at) || at > new Date(Date.now() + 5 * 60_000) || at < new Date(l.applied_on)) throw new UnprocessableEntityException('The visit time must be after the student applied and not in the future');
    return this.dbs.run(user, async (tx) => {
      const rows = await tx.update(t.sickLeave).set({ visited_by: visitor, visited_at: at.toISOString(), visit_remarks: dto.visit_remarks, updated_by: user.id })
        .where(eq(t.sickLeave.sick_leave_id, id)).returning();
      if (dto.diet) await tx.execute(sql`update hostel.sick_leave set diet = ${dto.diet}, diet_note = ${dto.diet_note ?? null}, updated_by = ${user.id} where sick_leave_id = ${id}`);
      return rows;
    });
  }

  /** The food sent to the room: Light, Liquid or Normal, with a note for the kitchen; meals not yet served follow it. */
  async setDiet(user: AuthUser, id: number, dto: { diet: 'Light' | 'Liquid' | 'Normal'; diet_note?: string | null }) {
    const [l] = await this.dbs.rows<{ status: string; facility_id: string | null }>(sql`select l.status::text as status, st.facility_id from hostel.sick_leave l
      left join hostel.fn_student_stay(l.student_id) st on true where l.sick_leave_id = ${id}`);
    if (!l) throw new NotFoundException('Sick leave not found');
    assertScope(user, l.facility_id);
    if (!['Applied', 'Recommended', 'Approved'].includes(l.status)) throw new UnprocessableEntityException(`This leave is ${l.status}`);
    await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.sick_leave set diet = ${dto.diet}, diet_note = ${dto.diet_note ?? null}, updated_by = ${user.id} where sick_leave_id = ${id}`));
    return { ok: true };
  }

  async close(user: AuthUser, id: number, closedOn?: string) {
    const l = await this.get(id, user);
    if (!['Approved', 'Recommended', 'Applied'].includes(l.status)) throw new ForbiddenException(`Leave is ${l.status}`);
    const [row] = await this.dbs.run(user, (tx) => tx.update(t.sickLeave).set({ status: 'Closed', closed_on: closedOn ?? new Date().toISOString().slice(0, 10), updated_by: user.id })
      .where(eq(t.sickLeave.sick_leave_id, id)).returning());
    return row;
  }

  sickList(date?: string, facilityId?: string) {
    const d = date ?? new Date().toISOString().slice(0, 10);
    return this.dbs.rows(sql`select * from hostel.v_mess_sick_list where meal_date = ${d}::date and (${facilityId ?? null}::text is null or facility_id = ${facilityId ?? null})
      order by facility_id, slot, space_id`);
  }

  delivery(user: AuthUser, id: number, mealDate: string, slot: string, status: 'Delivered' | 'Not_Required') {
    return this.dbs.run(user, (tx) => tx.update(t.sickMealDelivery).set({
      status, delivered_by: status === 'Delivered' ? user.id : null, delivered_at: status === 'Delivered' ? new Date().toISOString() : null, updated_by: user.id,
    }).where(and(eq(t.sickMealDelivery.sick_leave_id, id), eq(t.sickMealDelivery.meal_date, mealDate), eq(t.sickMealDelivery.slot, slot as never))).returning());
  }
}
