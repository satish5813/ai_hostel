import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Who sees deposits: wardens (own hostel / floors), Accounts, and management for the totals. */
export const CD_VIEW = ['Floor_Warden', 'Warden', 'Chief_Warden', 'Director_Hostels', 'Accounts_Section', 'Pro_VC_Finance', 'President', 'Vice_President', 'Pro_VC', 'admin'];
/** Who may propose a deduction. */
export const CD_PROPOSE = ['Floor_Warden', 'Warden', 'Chief_Warden', 'Director_Hostels', 'Accounts_Section', 'admin'];
export const CD_DECIDE = ['Chief_Warden', 'Director_Hostels', 'admin'];
export const CD_ACCOUNTS = ['Accounts_Section', 'admin'];

const ENTRY = sql`e.entry_id::int as entry_id, e.entry_no, e.entry_type, e.deposit_kind, e.category, e.amount::float as amount, e.reason, e.status, e.refund_mode, e.refund_ref, e.refund_account,
  e.created_at, e.decided_at, e.decision_remarks, e.handover_id::int as handover_id, e.demand_id::int as demand_id,
  initcap(coalesce(ps.full_name, e.proposed_by)) as proposed_by_name, initcap(ds.full_name) as decided_by_name, e.proposed_by`;
const ENTRY_FROM = sql`hostel.caution_entry e left join ref.staff_master ps on ps.staff_id = e.proposed_by left join ref.staff_master ds on ds.staff_id = e.decided_by`;

/**
 * CDP Caution deposit. Each student's refundable deposit as an account of lines with reasons (hostel.caution_entry,
 * db/migrations/116_caution_deposit.sql): paid in through the fee demand or held from before, deductions proposed by a
 * warden and approved by the Chief Manager, unpaid dues paid from it by Accounts, the balance refunded on leaving.
 * The money itself sits in the university's bank account through the payment gateway; the rules are in the database.
 */
@Injectable()
export class CautionService {
  constructor(private dbs: DbService) {}

  /** Students this person may see: by hostel, by floor for a Floor Manager, all for Accounts and management. */
  private scope(user: AuthUser): SQL {
    if (user.roles.some((r) => ['admin', 'Accounts_Section', 'Pro_VC_Finance', 'President', 'Vice_President', 'Pro_VC'].includes(r))) return sql`true`;
    if (user.roles.some((r) => ['Chief_Warden', 'Director_Hostels', 'Warden'].includes(r))) return facWhere('s.facility_id', null, user);
    if (user.roles.includes('Floor_Warden'))
      return sql`exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.status = 'Active' and a.hostel_role = 'Floor_Warden'
        and a.facility_id = s.facility_id and (a.zone_id is null or a.zone_id = s.zone_id))`;
    return sql`false`;
  }

  /** Every student with a deposit line or living in a hostel, with where they live (or last lived). */
  private readonly students = sql`(
    select sm.student_id, initcap(sm.full_name) as name, sm.programme, sm.gender,
           coalesce(cur.facility_id, last.facility_id) as facility_id, coalesce(cur.zone_id, last.zone_id) as zone_id,
           coalesce(cur.hostel_name, last.hostel_name) as hostel_name, coalesce(cur.bed_label, last.bed_label) as bed_label, cur.subspace_id is not null as resident,
           (select v.status::text from hostel.vacate_request v where v.student_id = sm.student_id order by v.vacate_id desc limit 1) as vacate_status
    from ref.student_master sm
    left join lateral (select b.* from hostel.hostel_allocation a join hostel.v_bed b on b.subspace_id = a.subspace_id where a.student_id = sm.student_id and a.status = 'Active' limit 1) cur on true
    left join lateral (select b.facility_id, b.zone_id, b.hostel_name, b.bed_label from hostel.hostel_allocation a join hostel.v_bed b on b.subspace_id = a.subspace_id
                        where a.student_id = sm.student_id order by a.allocation_date desc limit 1) last on true
    where cur.subspace_id is not null or exists (select 1 from hostel.caution_entry x where x.student_id = sm.student_id)
       or exists (select 1 from hostel.fee_demand x where x.student_id = sm.student_id and x.fee_head in ('Caution_Deposit', 'Electricity_Deposit'))) s`;

  private demand = (sid: SQL) => sql`(select coalesce(sum(d.amount_due - d.amount_paid), 0)::float from hostel.fee_demand d where d.student_id = ${sid} and d.fee_head in ('Caution_Deposit', 'Electricity_Deposit') and d.status in ('Pending', 'Part_Paid', 'Overdue'))`;

  async mine(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    return this.account(user.id);
  }

  private async account(sid: string) {
    const [b] = await this.dbs.rows(sql`select coalesce(b.paid_in, 0)::float as paid_in, coalesce(b.deducted, 0)::float as deducted, coalesce(b.refunded, 0)::float as refunded,
        coalesce(b.proposed, 0)::float as proposed, coalesce(b.balance, 0)::float as balance, ${this.demand(sql`${sid}`)} as to_pay,
        coalesce(b.hostel_balance, 0)::float as hostel_balance, coalesce(b.elec_balance, 0)::float as elec_balance,
        (select d.demand_id::int from hostel.fee_demand d where d.student_id = ${sid} and d.fee_head in ('Caution_Deposit', 'Electricity_Deposit') and d.status in ('Pending', 'Part_Paid', 'Overdue') order by d.demand_id limit 1) as demand_id,
        (select d.due_date from hostel.fee_demand d where d.student_id = ${sid} and d.fee_head in ('Caution_Deposit', 'Electricity_Deposit') and d.status in ('Pending', 'Part_Paid', 'Overdue') order by d.demand_id limit 1) as due_date
      from (select 1) x left join hostel.v_caution_balance b on b.student_id = ${sid}`);
    const entries = await this.dbs.rows(sql`select ${ENTRY} from ${ENTRY_FROM} where e.student_id = ${sid} order by e.entry_id desc`);
    return { ...b, entries };
  }

  /** Totals by hostel: held, paid in, deducted, refunded; deductions waiting; leavers waiting for their refund. */
  async summary(user: AuthUser) {
    return this.dbs.rows(sql`select s.facility_id, max(s.hostel_name) as hostel_name, count(*) filter (where s.resident)::int as residents,
        count(*) filter (where coalesce(b.balance, 0) > 0)::int as holding,
        coalesce(sum(b.balance), 0)::float as held, coalesce(sum(b.paid_in), 0)::float as paid_in, coalesce(sum(b.deducted), 0)::float as deducted, coalesce(sum(b.refunded), 0)::float as refunded,
        coalesce(sum(b.proposed), 0)::float as proposed, count(*) filter (where b.proposed > 0)::int as proposals,
        count(*) filter (where s.resident and coalesce(b.balance, 0) = 0)::int as not_paid,
        coalesce(sum(${this.demand(sql`s.student_id`)}), 0)::float as to_collect,
        count(*) filter (where coalesce(b.balance, 0) > 0 and (not s.resident or s.vacate_status in ('Approved', 'Checked_Out')))::int as to_refund,
        coalesce(sum(b.balance) filter (where not s.resident or s.vacate_status in ('Approved', 'Checked_Out')), 0)::float as to_refund_amount
      from ${this.students} left join hostel.v_caution_balance b on b.student_id = s.student_id
      where ${this.scope(user)} and s.facility_id is not null group by s.facility_id order by max(s.hostel_name)`);
  }

  async list(user: AuthUser, q?: string, facilityId?: string, show?: string) {
    const term = q ? `%${q.toLowerCase()}%` : null;
    const filter = show === 'proposals' ? sql`b.proposed > 0` : show === 'refund' ? sql`coalesce(b.balance, 0) > 0 and (not s.resident or s.vacate_status in ('Approved', 'Checked_Out'))`
      : show === 'unpaid' ? sql`s.resident and coalesce(b.balance, 0) = 0` : show === 'deducted' ? sql`b.deducted > 0` : sql`true`;
    return this.dbs.rows(sql`select s.student_id, s.name, s.programme, s.gender, s.facility_id, s.hostel_name, s.bed_label, s.resident, s.vacate_status,
        coalesce(b.paid_in, 0)::float as paid_in, coalesce(b.deducted, 0)::float as deducted, coalesce(b.refunded, 0)::float as refunded,
        coalesce(b.proposed, 0)::float as proposed, coalesce(b.balance, 0)::float as balance, ${this.demand(sql`s.student_id`)} as to_pay, b.last_entry_at
      from ${this.students} left join hostel.v_caution_balance b on b.student_id = s.student_id
      where ${this.scope(user)} and ${filter}
        and (${facilityId ?? null}::text is null or s.facility_id = ${facilityId ?? null})
        and (${term}::text is null or lower(s.name) like ${term} or s.student_id like ${term} or lower(coalesce(s.bed_label, '')) like ${term})
      order by b.proposed > 0 desc nulls last, s.hostel_name, s.bed_label limit 400`);
  }

  /** One student's account, with what can be settled from it: unpaid demands and room damages at handover. */
  async student(user: AuthUser, sid: string) {
    const [s] = await this.dbs.rows<{ student_id: string }>(sql`select s.* from ${this.students} where s.student_id = ${sid} and ${this.scope(user)}`);
    if (!s) throw new NotFoundException('Student not found');
    const acc = await this.account(sid);
    const dues = await this.dbs.rows(sql`select d.demand_id::int as demand_id, d.fee_head, d.instalment_no::int as instalment_no, d.reference_type, (d.amount_due - d.amount_paid)::float as balance, d.due_date, d.status
      from hostel.fee_demand d where d.student_id = ${sid} and d.fee_head not in ('Caution_Deposit', 'Electricity_Deposit') and d.status in ('Pending', 'Part_Paid', 'Overdue') order by d.due_date`);
    const damages = await this.dbs.rows(sql`select h.handover_id::int as handover_id, h.handover_type, h.handover_on, h.total_damage_amount::float as damage,
        (select string_agg(coalesce(am.asset_name, l.asset_id) || ' (' || l.condition || ')', ', ') from hostel.room_handover_line l left join infra.asset_master am on am.asset_id = l.asset_id where l.handover_id = h.handover_id and l.damage_amount > 0) as items
      from hostel.room_handover h join hostel.hostel_allocation a on a.hostel_alloc_id = h.hostel_alloc_id
      where a.student_id = ${sid} and h.total_damage_amount > 0
        and not exists (select 1 from hostel.caution_entry e where e.handover_id = h.handover_id and e.status in ('Proposed', 'Approved')) order by h.handover_on desc`);
    return { student: s, ...acc, dues, damages };
  }

  async opening(user: AuthUser, sid: string, dto: { kind: string; amount: number; reason: string }) {
    await this.student(user, sid);
    return this.insert(user, sql`insert into hostel.caution_entry (student_id, entry_type, deposit_kind, amount, reason, created_by) values (${sid}, 'Opening', ${dto.kind}, ${dto.amount}, ${dto.reason}, ${user.id}) returning entry_no`);
  }

  async propose(user: AuthUser, sid: string, dto: { kind: string; category: string; amount: number; reason: string; handover_id?: number | null }) {
    await this.student(user, sid);
    return this.insert(user, sql`insert into hostel.caution_entry (student_id, entry_type, deposit_kind, category, amount, reason, handover_id, created_by)
      values (${sid}, 'Deduction', ${dto.kind}, ${dto.category}, ${dto.amount}, ${dto.reason}, ${dto.handover_id ?? null}, ${user.id}) returning entry_no`);
  }

  async decide(user: AuthUser, entryId: number, dto: { decision: 'Approved' | 'Rejected'; remarks?: string | null }) {
    const [e] = await this.dbs.rows<{ student_id: string }>(sql`select student_id from hostel.caution_entry where entry_id = ${entryId}`);
    if (!e) throw new NotFoundException('Line not found');
    await this.student(user, e.student_id);
    return this.insert(user, sql`update hostel.caution_entry set status = ${dto.decision}, decided_by = ${user.id}, decision_remarks = ${dto.remarks ?? null}
      where entry_id = ${entryId} returning entry_no`);
  }

  async payDue(user: AuthUser, sid: string, demandId: number) {
    await this.student(user, sid);
    return this.insert(user, sql`select (select entry_no from hostel.caution_entry where entry_id = hostel.fn_caution_pay_due(${sid}, ${demandId}, ${user.id})) as entry_no`);
  }

  async refund(user: AuthUser, sid: string, dto: { kind: string; amount: number; mode: string; ref: string; account?: string | null; reason: string }) {
    await this.student(user, sid);
    return this.insert(user, sql`insert into hostel.caution_entry (student_id, entry_type, deposit_kind, amount, reason, refund_mode, refund_ref, refund_account, created_by)
      values (${sid}, 'Refund', ${dto.kind}, ${dto.amount}, ${dto.reason}, ${dto.mode}, ${dto.ref}, ${dto.account ?? null}, ${user.id}) returning entry_no`);
  }

  private async insert(user: AuthUser, q: SQL) {
    const rows = (await this.dbs.run(user, (tx) => tx.execute(q))) as unknown as { entry_no: string }[];
    if (!rows.length) throw new NotFoundException('Line not found');
    return rows[0];
  }
}
