import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * The data workspace (ADM-04): one list per master, with search, filter, sort and paging done in the database.
 * Each list returns its columns under the same names as the upload columns, so a row opens straight into the
 * edit form and is saved through POST /admin/import/:kind/save with the same checks as a file.
 */
type Entity = { kind: string; id: string; sql: SQL; sort: string; filters: string[]; status?: { on: string; off: string; set: (id: string, on: boolean, by: string) => SQL } };

const ENTITIES: Entity[] = [
  { kind: 'hostels', id: 'hostel_code', sort: 'hostel_code', filters: ['gender', 'status'],
    sql: sql`select hp.hostel_code, f.facility_name as hostel_name, hp.hostel_gender::text as gender, coalesce(f.no_of_floors, 0)::int as floors, to_char(hp.gate_close_time, 'HH24:MI') as gate_close_time,
      (select count(*)::int from infra.space s join infra.zone z on z.zone_id = s.zone_id where z.facility_id = hp.facility_id and s.space_category = 'Hostel_Room') as rooms,
      (select count(*)::int from hostel.v_bed b where b.facility_id = hp.facility_id) as beds,
      (select count(*)::int from hostel.v_bed b where b.facility_id = hp.facility_id and b.bed_status = 'Occupied') as occupied, hp.status::text as status
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id`,
    status: { on: 'Active', off: 'Closed', set: (id, on, by) => sql`update hostel.hostel_profile set status = ${on ? 'Active' : 'Closed'}::hostel.hostel_status, updated_by = ${by} where hostel_code = ${id}` } },
  { kind: 'room_types', id: 'type_name', sort: 'sharing_count', filters: ['status'],
    sql: sql`select rt.type_name, rt.sharing_count::int as sharing_count, case when rt.is_ac then 'Yes' else 'No' end as is_ac, case when rt.attached_bath then 'Yes' else 'No' end as attached_bath,
      (select count(*)::int from hostel.room_profile rp where rp.room_type_id = rt.room_type_id) as rooms, rt.status::text as status from hostel.room_type rt`,
    status: { on: 'Active', off: 'Inactive', set: (id, on) => sql`update hostel.room_type set status = ${on ? 'Active' : 'Inactive'}::shared.active_status where type_name = ${id}` } },
  { kind: 'rooms', id: 'space_id', sort: 'space_id', filters: ['hostel_code', 'floor_no', 'category', 'room_type', 'status'],
    sql: sql`select s.space_id, hp.hostel_code, z.sequence_no::int as floor_no, s.space_code as room_no, rt.type_name as room_type, s.space_category::text as category,
      coalesce(rp.reserved_for::text, 'None') as reserved_for, case when rp.is_accessible then 'Yes' else 'No' end as accessible,
      (select count(*)::int from infra.subspace ss where ss.space_id = s.space_id and ss.subspace_type = 'Bed') as beds,
      (select count(*)::int from infra.subspace ss where ss.space_id = s.space_id and ss.status = 'Occupied') as occupied, s.status::text as status
      from infra.space s join infra.zone z on z.zone_id = s.zone_id join hostel.hostel_profile hp on hp.facility_id = z.facility_id
      left join hostel.room_profile rp on rp.space_id = s.space_id left join hostel.room_type rt on rt.room_type_id = rp.room_type_id` },
  { kind: 'fees', id: 'fee_id', sort: 'hostel_code', filters: ['hostel_code', 'academic_year', 'room_type'],
    sql: sql`select f.fee_id::text as fee_id, hp.hostel_code, rt.type_name as room_type, f.academic_year, f.registration_fee::float as registration_fee, f.hostel_fee::float as hostel_fee,
      f.instalment_1_pct::float as instalment_1_pct, to_char(f.instalment_2_due_date, 'YYYY-MM-DD') as instalment_2_due_date
      from hostel.room_type_fee f join hostel.hostel_profile hp on hp.facility_id = f.facility_id join hostel.room_type rt on rt.room_type_id = f.room_type_id` },
  { kind: 'assets', id: 'asset_id', sort: 'asset_id', filters: ['hostel_code', 'category', 'condition', 'status'],
    sql: sql`select a.asset_id, hp.hostel_code, s.space_code as room_no, a.asset_name, a.asset_category::text as category, a.make_model, a.serial_no, to_char(a.purchase_date, 'YYYY-MM-DD') as purchase_date,
      a.cost::float as cost, to_char(a.warranty_expiry, 'YYYY-MM-DD') as warranty_expiry, coalesce(a.condition::text, 'Good') as condition, a.status::text as status
      from infra.asset_master a join infra.space s on s.space_id = a.space_id join infra.zone z on z.zone_id = s.zone_id join hostel.hostel_profile hp on hp.facility_id = z.facility_id`,
    status: { on: 'Active', off: 'Inactive', set: (id, on) => sql`update infra.asset_master set status = ${on ? 'Active' : 'Inactive'}::shared.active_status where asset_id = ${id}` } },
  { kind: 'meters', id: 'meter_no', sort: 'meter_no', filters: ['hostel_code', 'meter_type', 'status'],
    sql: sql`select m.meter_no, hp.hostel_code, s.space_code as room_no, m.meter_type::text as meter_type, m.device_ref, to_char(m.installed_on, 'YYYY-MM-DD') as installed_on,
      (select r.reading_kwh::float from hostel.meter_reading r where r.meter_id = m.meter_id order by r.reading_at desc limit 1) as last_reading, m.status::text as status
      from hostel.room_meter m join infra.space s on s.space_id = m.space_id join infra.zone z on z.zone_id = s.zone_id join hostel.hostel_profile hp on hp.facility_id = z.facility_id`,
    status: { on: 'Active', off: 'Faulty', set: (id, on, by) => sql`update hostel.room_meter set status = ${on ? 'Active' : 'Faulty'}::hostel.meter_status, updated_by = ${by} where meter_no = ${id}` } },
  { kind: 'staff', id: 'staff_id', sort: 'full_name', filters: ['dept_code', 'staff_type', 'status'],
    sql: sql`select sm.staff_id, sm.full_name, sm.salutation, sm.first_name, sm.middle_name, sm.last_name, sm.gender::text as gender, sm.dept_code, sm.designation, sm.staff_type::text as staff_type,
      sm.mobile_no, sm.official_email, sm.personal_email, to_char(sm.joining_date, 'YYYY-MM-DD') as joining_date,
      (select string_agg(ur.role_code, ', ' order by ur.role_code) from portal.app_user u join portal.user_role ur on ur.user_id = u.user_id where u.staff_id = sm.staff_id) as roles,
      (select count(*)::int from hostel.staff_space_assignment a where a.staff_id = sm.staff_id and a.status = 'Active') as duties, sm.status::text as status
      from ref.staff_master sm`,
    status: { on: 'Active', off: 'Inactive', set: (id, on) => sql`with s as (update ref.staff_master set status = ${on ? 'Active' : 'Inactive'}::shared.active_status where staff_id = ${id} returning staff_id) update portal.app_user u set active = ${on} from s where u.staff_id = s.staff_id` } },
  { kind: 'duties', id: 'assignment_id', sort: 'hostel_code', filters: ['hostel_code', 'hostel_role', 'shift', 'status'],
    sql: sql`select a.assignment_id::text as assignment_id, a.staff_id, st.full_name, a.hostel_role, hp.hostel_code, z.sequence_no::int as floor_no, s.space_code as area, a.shift::text as shift,
      case when a.show_on_qr then 'Yes' else 'No' end as show_on_qr, to_char(a.from_date, 'YYYY-MM-DD') as from_date, a.status::text as status
      from hostel.staff_space_assignment a join ref.staff_master st on st.staff_id = a.staff_id join hostel.hostel_profile hp on hp.facility_id = a.facility_id
      left join infra.zone z on z.zone_id = a.zone_id left join infra.space s on s.space_id = a.space_id`,
    status: { on: 'Active', off: 'Ended', set: (id, on, by) => on ? sql`select 1` : sql`update hostel.staff_space_assignment set status = 'Ended', to_date = current_date, updated_by = ${by} where assignment_id = ${Number(id)} and status = 'Active'` } },
  { kind: 'students', id: 'student_id', sort: 'student_id', filters: ['gender', 'student_type', 'programme', 'dept_code', 'hosteller', 'status'],
    sql: sql`select sm.student_id, sm.full_name, sm.gender::text as gender, sm.student_type::text as student_type, sm.programme, to_char(sm.date_of_birth, 'YYYY-MM-DD') as date_of_birth, sm.personal_email, sm.dept_code,
      sm.father_name, sm.mother_name, sm.admission_type::text as admission_type, sm.offering_mode::text as offering_mode, sm.regulation, sm.caste_category::text as caste_category, sm.nationality, sm.religion,
      sm.blood_group::text as blood_group, sm.disability, to_char(sm.admission_date, 'YYYY-MM-DD') as admission_date,
      (select b.hostel_code || '-' || b.room_code from hostel.hostel_allocation a join hostel.v_bed b on b.subspace_id = a.subspace_id where a.student_id = sm.student_id and a.status = 'Active' limit 1) as room,
      case when sm.is_hosteller then 'Yes' else 'No' end as hosteller,
      (select count(*)::int from hostel.student_contact c where c.student_id = sm.student_id) as contacts, sm.status::text as status
      from ref.student_master sm`,
    status: { on: 'Active', off: 'Suspended', set: (id, on) => sql`update ref.student_master set status = ${on ? 'Active' : 'Suspended'}::ref.student_status where student_id = ${id}` } },
  { kind: 'bed_map', id: 'student_id', sort: 'hostel_code', filters: ['hostel_code', 'floor_no', 'gender', 'academic_year'],
    sql: sql`select a.student_id, sm.full_name, sm.gender::text as gender, sm.programme, b.hostel_code, b.floor_no::int as floor_no, b.room_code as room_no, regexp_replace(b.bed_code, '[^0-9]', '', 'g') as bed_no,
      a.key_no, to_char(a.allocation_date, 'YYYY-MM-DD') as check_in_date, a.academic_year
      from hostel.hostel_allocation a join ref.student_master sm on sm.student_id = a.student_id join hostel.v_bed b on b.subspace_id = a.subspace_id
      where a.status = 'Active' and a.occupant_type = 'Student'` },
];
const ident = (k: string) => { if (!/^[a-z_0-9]+$/.test(k)) throw new BadRequestException('Bad column'); return sql.raw(`"${k}"`); };

@Injectable()
export class DataService {
  constructor(private dbs: DbService) {}
  private entity(k: string) { const e = ENTITIES.find((x) => x.kind === k); if (!e) throw new NotFoundException(`No data list for "${k}"`); return e; }

  /** The list behind every data screen. Search looks across every column of the row. */
  async list(kind: string, q: { q?: string; sort?: string; dir?: string; page?: string; size?: string; filters: Record<string, string> }) {
    const e = this.entity(kind);
    const [probe] = await this.dbs.rows<Record<string, unknown>>(sql`select * from (${e.sql}) t limit 1`);
    const columns = probe ? Object.keys(probe) : [];
    const where: SQL[] = [sql`true`];
    if (q.q?.trim()) where.push(sql`t::text ilike ${'%' + q.q.trim() + '%'}`);
    for (const [k, v] of Object.entries(q.filters)) if (v !== '' && e.filters.includes(k)) where.push(sql`${ident(k)}::text = ${v}`);
    const sortKey = q.sort && (columns.includes(q.sort) || !probe) ? q.sort : e.sort;
    const dir = q.dir === 'desc' ? sql.raw('desc') : sql.raw('asc');
    const size = Math.min(Math.max(Number(q.size) || 50, 10), 500); const page = Math.max(Number(q.page) || 0, 0);
    const base = sql`from (${e.sql}) t where ${sql.join(where, sql` and `)}`;
    const rows = await this.dbs.rows(sql`select * ${base} order by ${ident(sortKey)} ${dir} nulls last, ${ident(e.id)} limit ${size} offset ${page * size}`);
    const [c] = await this.dbs.rows<{ n: number }>(sql`select count(*)::int as n ${base}`);
    const facets: Record<string, string[]> = {};
    for (const f of e.filters) {
      const vals = await this.dbs.rows<{ v: string }>(sql`select distinct ${ident(f)}::text as v from (${e.sql}) t where ${ident(f)} is not null order by 1 limit 60`);
      facets[f] = vals.map((x) => x.v);
    }
    return { rows, total: c?.n ?? 0, page, size, sort: sortKey, dir: q.dir === 'desc' ? 'desc' : 'asc', id: e.id, filters: e.filters, facets, status: e.status ? { on: e.status.on, off: e.status.off } : null };
  }

  async setStatus(user: AuthUser, kind: string, id: string, active: boolean) {
    const e = this.entity(kind); if (!e.status) throw new BadRequestException('This record has no status to change');
    await this.dbs.run(user, (tx) => tx.execute(e.status!.set(id, active, user.id)));
    return { ok: true };
  }

  /** Export: every row that matches the search and filters, up to 20,000. */
  async export(kind: string, q: { q?: string; sort?: string; dir?: string; filters: Record<string, string> }) {
    return this.list(kind, { ...q, page: '0', size: '500' }).then(async (first) => {
      if (first.total <= first.rows.length) return first.rows;
      const all = [...first.rows];
      for (let p = 1; all.length < Math.min(first.total, 20000); p++) all.push(...(await this.list(kind, { ...q, page: String(p), size: '500' })).rows);
      return all;
    });
  }
}
