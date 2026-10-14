import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Who works on room changes: the Floor Manager (own floors), the Chief Manager and Warden (own hostels), the Director; Accounts and the Pro-VC Finance see them for refunds. */
export const RC_WARDENS = ['Floor_Warden', 'Chief_Warden', 'Director_Hostels', 'Warden', 'admin'];
export const RC_VIEW = [...RC_WARDENS, 'Accounts_Section', 'Pro_VC_Finance', 'Room_Allotment', 'Office_Staff'];
const CW = ['Chief_Warden', 'Director_Hostels', 'admin'];

const ROW = sql`rc.change_id::int as change_id, rc.change_no, rc.student_id, initcap(sm.full_name) as name, sm.programme, sm.gender, rc.facility_id, fb.hostel_name,
  rc.kind, rc.status, rc.reason, rc.requested_at, rc.move_date, rc.key_no, rc.meter_reading::float as meter_reading,
  fb.bed_label as from_bed, fb.floor_name as from_floor, ft.type_name as from_type, tb.bed_label as to_bed, tb.floor_name as to_floor, tb.subspace_id as to_subspace_id,
  rc.to_room_type_id::int as to_room_type_id, tt.type_name as to_type,
  rc.hostel_adjustment::float as hostel_adjustment, rc.refund_due::float as refund_due, rc.elec_amount::float as elec_amount,
  initcap(ab.full_name) as approved_by_name, rc.arranged_by is not null as arranged, initcap(mb.full_name) as moved_by_name,
  (select s.approver_role from shared.approval_step s where s.request_type = 'Room_Change' and s.request_id = rc.change_id and s.decision = 'Pending' order by s.level limit 1) as waiting_for`;
const FROM = sql`hostel.room_change rc join ref.student_master sm on sm.student_id = rc.student_id join hostel.v_bed fb on fb.subspace_id = rc.from_subspace_id join hostel.room_type ft on ft.room_type_id = rc.from_room_type_id
  join hostel.room_type tt on tt.room_type_id = rc.to_room_type_id left join hostel.v_bed tb on tb.subspace_id = rc.to_subspace_id
  left join ref.staff_master ab on ab.staff_id = rc.approved_by left join ref.staff_master mb on mb.staff_id = rc.moved_by`;

/**
 * RCH Room change. The student asks for another room (another room type, or the same type elsewhere) in their hostel;
 * the Floor Manager and then the Chief Manager approve on the shared approval engine; on the day the move is carried out
 * and the hostel fee and electricity are settled by hostel.fn_room_change_complete (db/migrations/115_room_change.sql).
 */
@Injectable()
export class RoomChangeService {
  constructor(private dbs: DbService) {}

  /** The requests a staff member may see. */
  private scope(user: AuthUser): SQL {
    if (user.roles.some((r) => ['admin', 'Accounts_Section', 'Pro_VC_Finance'].includes(r))) return sql`true`;
    if (user.roles.some((r) => ['Chief_Warden', 'Director_Hostels', 'Warden', 'Room_Allotment', 'Office_Staff'].includes(r))) return facWhere('rc.facility_id', null, user);
    if (user.roles.includes('Floor_Warden'))
      return sql`exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.status = 'Active' and a.hostel_role = 'Floor_Warden'
        and a.facility_id = rc.facility_id and (a.zone_id is null or a.zone_id = fb.zone_id))`;
    return sql`false`;
  }

  /* ------------------------------------------------------------ student */

  /** My room, the room types of my hostel with their fee and free beds, my requests. */
  async mine(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const [stay] = await this.dbs.rows<{ facility_id: string; room_type_id: number; space_id: string }>(sql`select b.bed_label, b.room_code, b.floor_name, b.hostel_name, b.facility_id, b.type_name,
        b.room_type_id::int as room_type_id, b.space_id, b.sharing_count::int as sharing_count, b.is_ac, f.hostel_fee::float as hostel_fee
      from hostel.fn_student_stay(${user.id}) st join hostel.v_bed b on b.subspace_id = st.subspace_id
      left join hostel.room_type_fee f on f.facility_id = b.facility_id and f.room_type_id = b.room_type_id and f.academic_year = (select academic_year from hostel.academic_year where is_current)`);
    const types = stay ? await this.dbs.rows(sql`select rt.room_type_id::int as room_type_id, rt.type_name, rt.sharing_count::int as sharing_count, rt.is_ac, rt.attached_bath, f.hostel_fee::float as hostel_fee,
        (select count(*)::int from hostel.v_bed b where b.facility_id = f.facility_id and b.room_type_id = rt.room_type_id and b.bed_status = 'Vacant'
           and not coalesce(b.is_blocked, false) and b.room_status <> 'Under_Maintenance' and b.space_id <> ${stay.space_id}) as free_beds
      from hostel.room_type_fee f join hostel.room_type rt using (room_type_id)
      where f.facility_id = ${stay.facility_id} and f.academic_year = (select academic_year from hostel.academic_year where is_current) order by f.hostel_fee desc, rt.type_name`) : [];
    const requests = await this.dbs.rows<{ change_id: number }>(sql`select ${ROW}, rc.statement from ${FROM} where rc.student_id = ${user.id} order by rc.change_id desc`);
    const steps = requests.length ? await this.steps(requests.map((r) => r.change_id)) : [];
    return { stay: stay ?? null, types, requests: requests.map((r) => ({ ...r, steps: steps.filter((s) => s.request_id === r.change_id) })) };
  }

  /** Free beds of a room type in my hostel, room by room. */
  async beds(user: AuthUser, typeId: number) {
    const [st] = await this.dbs.rows<{ facility_id: string; space_id: string }>(sql`select facility_id, space_id from hostel.fn_student_stay(${user.id})`);
    if (!st?.facility_id) throw new UnprocessableEntityException('You do not live in a hostel room');
    return this.freeBeds(st.facility_id, typeId, st.space_id);
  }

  private freeBeds(facilityId: string, typeId: number | null, exceptSpace: string, keep?: string | null) {
    return this.dbs.rows(sql`select b.subspace_id, b.bed_label, b.bed_code, b.room_code, b.space_id, b.floor_name, b.floor_no::int as floor_no, b.type_name, b.is_ac,
        b.room_type_id::int as room_type_id, b.sharing_count::int as sharing_count,
        (select f.hostel_fee::float from hostel.room_type_fee f where f.facility_id = b.facility_id and f.room_type_id = b.room_type_id
          and f.academic_year = (select academic_year from hostel.academic_year where is_current)) as hostel_fee,
        (select count(*)::int from hostel.v_bed o where o.space_id = b.space_id and o.bed_status = 'Occupied') as occupied
      from hostel.v_bed b
      where b.facility_id = ${facilityId} and (${typeId}::int is null or b.room_type_id = ${typeId}) and b.space_id <> ${exceptSpace}
        and ((b.bed_status = 'Vacant' and not coalesce(b.is_blocked, false) and b.room_status <> 'Under_Maintenance'
              and not exists (select 1 from hostel.room_change x where x.to_subspace_id = b.subspace_id and x.status in ('Pending_FW', 'Pending_CW', 'Approved')))
             or b.subspace_id = ${keep ?? ''})
      order by b.type_name, b.floor_no, b.room_code, b.bed_code limit 600`);
  }

  /** What the change would do to my money if I moved today. */
  async preview(user: AuthUser, typeId: number) {
    const [r] = await this.dbs.rows<{ s: unknown }>(sql`select hostel.fn_room_change_statement(${user.id}, ${typeId}::smallint, current_date, null) as s`);
    return r.s;
  }

  async request(user: AuthUser, dto: { kind: 'Room_Type' | 'Same_Type'; to_room_type_id?: number | null; to_subspace_id?: string | null; reason: string }) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const rows = await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.room_change (student_id, facility_id, from_alloc_id, from_subspace_id, from_room_type_id, kind, to_room_type_id, to_subspace_id, reason, created_by)
      select ${user.id}, st.facility_id, st.hostel_alloc_id, st.subspace_id, b.room_type_id, ${dto.kind}, coalesce(${dto.to_room_type_id ?? null}::smallint, b.room_type_id), ${dto.to_subspace_id ?? null}, ${dto.reason}, ${user.id}
      from hostel.fn_student_stay(${user.id}) st join hostel.v_bed b on b.subspace_id = st.subspace_id
      returning change_id::int as change_id`));
    const row = (rows as unknown as { change_id: number }[])[0];
    if (!row) throw new UnprocessableEntityException('You do not live in a hostel room');
    const [r] = await this.dbs.rows<{ change_no: string }>(sql`select change_no from hostel.room_change where change_id = ${row.change_id}`);
    return { change_id: row.change_id, change_no: r.change_no };
  }

  async cancel(user: AuthUser, id: number) {
    const rows = await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.room_change set status = 'Cancelled', updated_by = ${user.id}
      where change_id = ${id} and student_id = ${user.id} and status in ('Pending_FW', 'Pending_CW', 'Approved') returning change_id`));
    if (!(rows as unknown as unknown[]).length) throw new UnprocessableEntityException('Only an open request of yours can be cancelled');
    return { ok: true };
  }

  /* ------------------------------------------------------------ staff */

  async list(user: AuthUser, status?: string) {
    const st = status === 'open' ? sql`rc.status in ('Pending_FW', 'Pending_CW', 'Approved')` : status === 'refund' ? sql`rc.refund_due > 0` : status ? sql`rc.status = ${status}` : sql`true`;
    const rows = await this.dbs.rows(sql`select ${ROW} from ${FROM} where ${this.scope(user)} and ${st} order by
      case rc.status when 'Pending_FW' then 1 when 'Pending_CW' then 2 when 'Approved' then 3 else 4 end, rc.change_id desc limit 500`);
    const [n] = await this.dbs.rows(sql`select count(*) filter (where rc.status = 'Pending_FW')::int as pending_fw, count(*) filter (where rc.status = 'Pending_CW')::int as pending_cw,
        count(*) filter (where rc.status = 'Approved')::int as to_move, count(*) filter (where rc.status = 'Moved' and rc.move_date >= date_trunc('month', current_date))::int as moved_month,
        coalesce(sum(rc.hostel_adjustment) filter (where rc.status = 'Moved' and rc.hostel_adjustment > 0), 0)::float as extra_fee,
        coalesce(sum(rc.refund_due) filter (where rc.status = 'Moved'), 0)::float as refunds
      from ${FROM} where ${this.scope(user)}`);
    return { rows, counts: n };
  }

  async detail(user: AuthUser, id: number) {
    const where = user.kind === 'student' ? sql`rc.student_id = ${user.id}` : this.scope(user);
    const [r] = await this.dbs.rows<Record<string, unknown> & { status: string; student_id: string; to_room_type_id: number; facility_id: string; to_subspace_id: string | null; statement: unknown }>(
      sql`select ${ROW}, rc.statement, fb.space_id as from_space_id from ${FROM} where rc.change_id = ${id} and ${where}`);
    if (!r) throw new NotFoundException('Room change not found');
    const steps = await this.steps([id]);
    const open = ['Pending_FW', 'Pending_CW', 'Approved'].includes(r.status);
    let statement = r.statement;
    if (!statement && open) {
      const [s] = await this.dbs.rows<{ s: unknown }>(sql`select hostel.fn_room_change_statement(${r.student_id}, ${r.to_room_type_id}::smallint, current_date, null) as s`).catch(() => [{ s: null }]);
      statement = s.s;
    }
    const pending = steps.find((s) => s.decision === 'Pending');
    const isCw = user.roles.some((x) => CW.includes(x));
    const can = user.kind === 'student' ? { cancel: open } : {
      decide: !!pending && (pending.approver_role === 'Floor_Warden' ? user.roles.includes('Floor_Warden') || isCw : isCw),
      bed: isCw && open,
      complete: r.status === 'Approved' && (isCw || user.roles.includes('Floor_Warden')),
    };
    const beds = user.kind !== 'student' && isCw && open ? await this.freeBeds(r.facility_id, null, String(r.from_space_id), r.to_subspace_id) : [];
    const [meter] = await this.dbs.rows(sql`select m.meter_no, m.meter_type, (select reading_kwh::float from hostel.meter_reading x where x.meter_id = m.meter_id order by reading_at desc limit 1) as last_reading,
        (select reading_at from hostel.meter_reading x where x.meter_id = m.meter_id order by reading_at desc limit 1) as last_at
      from hostel.room_meter m where m.space_id = ${String(r.from_space_id)} and m.status = 'Active' order by m.meter_id desc limit 1`);
    return { ...r, statement, steps, can, beds, meter: meter ?? null };
  }

  private steps(ids: number[]) {
    return this.dbs.rows<{ request_id: number; level: number; approver_role: string; decision: string }>(sql`select s.request_id::int as request_id, s.level::int as level, s.approver_role, s.decision,
        s.decided_on, s.remarks, initcap(st.full_name) as acted_by_name, r.step_name
      from shared.approval_step s left join ref.staff_master st on st.staff_id = s.acted_by left join shared.approval_rule r on r.rule_id = s.rule_id
      where s.request_type = 'Room_Change' and s.request_id = any(string_to_array(${ids.join(',')}, ',')::bigint[]) order by s.request_id, s.level`);
  }

  async setBed(user: AuthUser, id: number, subspaceId: string) {
    await this.detail(user, id);
    const rows = await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.room_change rc set to_subspace_id = ${subspaceId}, updated_by = ${user.id},
        to_room_type_id = coalesce((select b.room_type_id from hostel.v_bed b where b.subspace_id = ${subspaceId}), rc.to_room_type_id)
      where rc.change_id = ${id} returning rc.change_id`));
    if (!(rows as unknown as unknown[]).length) throw new NotFoundException('Room change not found');
    return { ok: true };
  }

  /** The next level's decision; the database checks who may take it. */
  async decide(user: AuthUser, id: number, decision: 'Approved' | 'Rejected', remarks?: string | null) {
    const d = await this.detail(user, id);
    const isCw = user.roles.some((x) => CW.includes(x));
    return this.dbs.run(user, async (tx) => {
      const next = () => tx.execute(sql`update shared.approval_step s set decision = ${decision}::shared.decision, acted_by = ${user.id}, remarks = ${remarks ?? null}
        where s.step_id = (select step_id from shared.approval_step where request_type = 'Room_Change' and request_id = ${id} and decision = 'Pending' order by level limit 1)
        returning s.level::int as level`) as unknown as Promise<{ level: number }[]>;
      const [first] = await next();
      if (!first) throw new UnprocessableEntityException('Nothing is waiting for a decision on this request');
      if (isCw && decision === 'Approved' && first.level === 1 && d.to_subspace_id) await next();
      return { ok: true };
    });
  }

  /* ------------------------------------------------------------ the Chief Manager moves a student */

  /** Residents of the Chief Manager's hostels, to choose whom to move. */
  residents(user: AuthUser, q?: string) {
    const term = q ? `%${q.toLowerCase()}%` : null;
    return this.dbs.rows(sql`select b.student_id, initcap(sm.full_name) as name, sm.programme, b.bed_label, b.type_name, b.floor_name, b.facility_id, b.hostel_name
      from hostel.v_bed b join ref.student_master sm on sm.student_id = b.student_id
      where b.occupant_type = 'Student' and ${facWhere('b.facility_id', null, user)}
        and (${term}::text is null or lower(sm.full_name) like ${term} or b.student_id like ${term} or lower(b.bed_label) like ${term})
      order by b.hostel_name, b.bed_label limit 60`);
  }

  /** For one resident: where they live, the free beds of every type in their hostel, their room's meter. */
  async options(user: AuthUser, sid: string) {
    const [st] = await this.dbs.rows<{ facility_id: string; space_id: string }>(sql`select b.bed_label, b.type_name, b.floor_name, b.facility_id, b.hostel_name, b.space_id,
        initcap(sm.full_name) as name, b.room_type_id::int as room_type_id
      from hostel.fn_student_stay(${sid}) s join hostel.v_bed b on b.subspace_id = s.subspace_id join ref.student_master sm on sm.student_id = ${sid}
      where ${facWhere('b.facility_id', null, user)}`);
    if (!st) throw new NotFoundException('This student does not live in your hostels');
    const [meter] = await this.dbs.rows(sql`select m.meter_no, (select reading_kwh::float from hostel.meter_reading x where x.meter_id = m.meter_id order by reading_at desc limit 1) as last_reading,
        (select reading_at from hostel.meter_reading x where x.meter_id = m.meter_id order by reading_at desc limit 1) as last_at
      from hostel.room_meter m where m.space_id = ${st.space_id} and m.status = 'Active' order by m.meter_id desc limit 1`);
    const [open] = await this.dbs.rows(sql`select change_no, status from hostel.room_change where student_id = ${sid} and status in ('Pending_FW', 'Pending_CW', 'Approved')`);
    return { stay: st, beds: await this.freeBeds(st.facility_id, null, st.space_id), meter: meter ?? null, open: open ?? null };
  }

  async staffPreview(user: AuthUser, sid: string, typeId: number) {
    await this.options(user, sid);
    const [r] = await this.dbs.rows<{ s: unknown }>(sql`select hostel.fn_room_change_statement(${sid}, ${typeId}::smallint, current_date, null) as s`);
    return r.s;
  }

  async direct(user: AuthUser, dto: { student_id: string; to_subspace_id: string; reason: string; move_now: boolean; meter_reading?: number | null; key_no?: string | null }) {
    await this.options(user, dto.student_id);
    const rows = await this.dbs.run(user, (tx) => tx.execute(sql`select c.change_id::int as change_id, c.change_no, c.status from hostel.room_change c
      where c.change_id = hostel.fn_room_change_direct(${dto.student_id}, ${dto.to_subspace_id}, ${dto.reason}, ${user.id}, ${dto.move_now}, ${dto.meter_reading ?? null}::numeric, ${dto.key_no ?? null})`));
    return (rows as unknown as { change_id: number; change_no: string; status: string }[])[0];
  }

  async complete(user: AuthUser, id: number, dto: { meter_reading?: number | null; key_no?: string | null }) {
    await this.detail(user, id);
    const rows = await this.dbs.run(user, (tx) => tx.execute(sql`select hostel.fn_room_change_complete(${id}, ${user.id}, ${dto.meter_reading ?? null}::numeric, ${dto.key_no ?? null}) as s`));
    return (rows as unknown as { s: unknown }[])[0].s;
  }
}
