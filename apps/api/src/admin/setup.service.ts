import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * Masters: what the Data Administrator sets up before any workflow can run, in this order:
 *   academic year > hostel buildings > floors > rooms and beds (with room type) > fees per room type > mess >
 *   staff and their duties > users and roles > approval rules > report visibility.
 * Students and staff normally arrive from the university ERP import; the manual forms are for gaps and for testing.
 */
@Injectable()
export class SetupService {
  constructor(private dbs: DbService) {}

  /** Admin dashboard: one row of counts, used for the set-up checklist. */
  async overview() {
    const [c] = await this.dbs.rows(sql`
      select
        (select count(*)::int from hostel.academic_year) as years,
        (select academic_year from hostel.academic_year where is_current) as current_year,
        (select count(*)::int from hostel.hostel_profile) as hostels,
        (select count(*)::int from infra.zone z join hostel.hostel_profile hp on hp.facility_id = z.facility_id) as floors,
        (select count(*)::int from infra.space s join infra.zone z on z.zone_id = s.zone_id join hostel.hostel_profile hp on hp.facility_id = z.facility_id where s.space_category = 'Hostel_Room') as rooms,
        (select count(*)::int from infra.space s join infra.zone z on z.zone_id = s.zone_id join hostel.hostel_profile hp on hp.facility_id = z.facility_id
           where s.space_category = 'Hostel_Room' and not exists (select 1 from hostel.room_profile rp where rp.space_id = s.space_id)) as rooms_without_type,
        (select count(*)::int from hostel.v_bed) as beds,
        (select count(*)::int from hostel.v_bed where bed_status = 'Occupied') as beds_occupied,
        (select count(*)::int from hostel.room_type where status = 'Active') as room_types,
        (select count(*)::int from hostel.room_type_fee f where f.academic_year = (select academic_year from hostel.academic_year where is_current)) as fees,
        (select count(*)::int from hostel.mess_master where status = 'Active') as messes,
        (select count(*)::int from hostel.electricity_tariff where approved_by is not null and (effective_to is null or effective_to >= current_date)) as tariffs,
        (select count(*)::int from hostel.electricity_tariff where approved_by is null) as tariffs_pending,
        (select count(*)::int from hostel.room_meter where status = 'Active') as meters,
        (select count(*)::int from ref.staff_master where status = 'Active') as staff,
        (select count(*)::int from hostel.staff_space_assignment where status = 'Active') as duties,
        (select count(*)::int from hostel.v_floors_without_warden) as floors_without_warden,
        (select count(*)::int from portal.app_user where active) as users,
        (select count(distinct user_id)::int from portal.user_role) as users_with_role,
        (select count(*)::int from shared.approval_rule where status = 'Active') as approval_rules,
        (select count(*)::int from shared.report_visibility where status = 'Active') as report_rows,
        (select count(*)::int from ref.student_master) as students,
        (select count(*)::int from hostel.hostel_allocation where status = 'Active' and occupant_type = 'Student') as residents,
        (select count(*)::int from hostel.capture_point) as capture_points,
        (select count(*)::int from hostel.space_qr where status = 'Active') as qr_labels`);
    const hostels = await this.dbs.rows(sql`select hostel_code, hostel_name, sum(total_beds)::int as total_beds, sum(occupied_beds)::int as occupied_beds, sum(vacant_beds)::int as vacant_beds from hostel.v_vacancy group by 1, 2 order by 1`);
    const chains = await this.dbs.rows(sql`select request_type, jsonb_agg(jsonb_build_object('level', level, 'role', approver_role, 'when', condition_value) order by level) as levels from shared.approval_rule where status = 'Active' group by 1 order by 1`);
    const recent = await this.dbs.rows(sql`select audit_id::int as audit_id, occurred_at, kind, actor, role_code, table_name, row_key from shared.audit_log order by audit_id desc limit 8`);
    const roles = await this.dbs.rows(sql`select r.role_code, r.name, count(ur.user_id)::int as users from portal.role r left join portal.user_role ur on ur.role_code = r.role_code where r.module = 'hostel' or r.role_code = 'admin' group by 1, 2 having count(ur.user_id) > 0 order by 3 desc, 2`);
    return { counts: c, hostels, chains, recent, roles };
  }

  /* ---------- academic years ---------- */
  years() { return this.dbs.rows(sql`select academic_year, start_date, end_date, is_current, registration_opens, registration_closes, renewal_opens, renewal_closes from hostel.academic_year order by start_date desc`); }
  async addYear(user: AuthUser, dto: { academic_year: string; start_date: string; end_date: string }) {
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.academic_year (academic_year, start_date, end_date, is_current) values (${dto.academic_year}, ${dto.start_date}::date, ${dto.end_date}::date, false)`));
    return { ok: true };
  }
  async setCurrentYear(user: AuthUser, year: string) {
    await this.dbs.run(user, async (tx) => {
      await tx.execute(sql`update hostel.academic_year set is_current = false where is_current`);
      const r = await tx.execute(sql`update hostel.academic_year set is_current = true where academic_year = ${year} returning academic_year`);
      if (!(r as unknown as unknown[]).length) throw new NotFoundException('Academic year not found');
    });
    return { ok: true };
  }

  /* ---------- buildings, floors, rooms, beds ---------- */
  structure() {
    return this.dbs.rows(sql`
      select hp.facility_id, f.facility_name, hp.hostel_code, hp.hostel_gender, hp.gate_close_time, hp.status, f.campus_id,
        coalesce((select jsonb_agg(jsonb_build_object('zone_id', z.zone_id, 'zone_name', z.zone_name, 'sequence_no', z.sequence_no,
          'spaces', coalesce((select jsonb_agg(jsonb_build_object('space_id', s.space_id, 'space_code', s.space_code, 'space_name', s.space_name, 'space_category', s.space_category, 'status', s.status,
                'room_type_id', rp.room_type_id, 'type_name', rt.type_name, 'sharing_count', rt.sharing_count, 'is_ac', rt.is_ac, 'reserved_for', rp.reserved_for, 'is_accessible', rp.is_accessible,
                'beds', (select count(*) from infra.subspace ss where ss.space_id = s.space_id and ss.subspace_type = 'Bed'),
                'occupied', (select count(*) from infra.subspace ss where ss.space_id = s.space_id and ss.subspace_type = 'Bed' and ss.status = 'Occupied')) order by s.space_code)
              from infra.space s left join hostel.room_profile rp on rp.space_id = s.space_id left join hostel.room_type rt on rt.room_type_id = rp.room_type_id where s.zone_id = z.zone_id), '[]'::jsonb)) order by z.sequence_no)
          from infra.zone z where z.facility_id = hp.facility_id), '[]'::jsonb) as floors
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id order by hp.hostel_code`);
  }

  async addHostel(user: AuthUser, dto: { hostel_code: string; facility_name: string; hostel_gender: 'Boys' | 'Girls' | 'Staff'; floors: number; campus_id?: string; gate_close_time?: string }) {
    const code = dto.hostel_code.toUpperCase();
    const fid = `H-${code}`;
    const [dup] = await this.dbs.rows(sql`select 1 from hostel.hostel_profile where hostel_code = ${code} or facility_id = ${fid}`);
    if (dup) throw new ConflictException(`Hostel code ${code} already exists`);
    await this.dbs.run(user, async (tx) => {
      await tx.execute(sql`insert into ref.department (dept_code, dept_name) values ('HOSTELS', 'University Hostels') on conflict do nothing`);
      await tx.execute(sql`insert into infra.facility (facility_id, campus_id, facility_name, facility_type, no_of_floors)
        values (${fid}, coalesce(${dto.campus_id ?? null}, (select campus_id from infra.campus order by campus_id limit 1)), ${dto.facility_name}, 'Hostel', ${dto.floors})`);
      await tx.execute(sql`insert into hostel.hostel_profile (facility_id, hostel_code, hostel_gender, dept_code, gate_close_time, created_by) values (${fid}, ${code}, ${dto.hostel_gender}::hostel.hostel_gender, 'HOSTELS', ${dto.gate_close_time ?? '21:30'}::time, ${user.id})`);
      for (let n = 1; n <= dto.floors; n++) await tx.execute(sql`insert into infra.zone (zone_id, facility_id, zone_name, zone_type, sequence_no) values (${`${code}-F${n}`}, ${fid}, ${`Floor ${n}`}, 'Floor', ${n})`);
    });
    return { facility_id: fid };
  }

  async addFloor(user: AuthUser, facilityId: string, name?: string) {
    const [h] = await this.dbs.rows<{ hostel_code: string; next: number }>(sql`select hp.hostel_code, coalesce((select max(sequence_no) from infra.zone z where z.facility_id = hp.facility_id), 0) + 1 as next from hostel.hostel_profile hp where hp.facility_id = ${facilityId}`);
    if (!h) throw new NotFoundException('Hostel not found');
    const zoneId = `${h.hostel_code}-F${h.next}`;
    await this.dbs.run(user, async (tx) => {
      await tx.execute(sql`insert into infra.zone (zone_id, facility_id, zone_name, zone_type, sequence_no) values (${zoneId}, ${facilityId}, ${name || `Floor ${h.next}`}, 'Floor', ${h.next})`);
      await tx.execute(sql`update infra.facility set no_of_floors = greatest(coalesce(no_of_floors, 0), ${h.next}) where facility_id = ${facilityId}`);
    });
    return { zone_id: zoneId };
  }

  /** Add rooms to a floor. A hostel room gets its room type and one bed row per sharing place; other places (toilet block, common area, store) get no beds. */
  async addRooms(user: AuthUser, zoneId: string, dto: { room_nos: string[]; space_category: string; room_type_id?: number; reserved_for?: string; is_accessible?: boolean }) {
    const [z] = await this.dbs.rows<{ hostel_code: string }>(sql`select hp.hostel_code from infra.zone z join hostel.hostel_profile hp on hp.facility_id = z.facility_id where z.zone_id = ${zoneId}`);
    if (!z) throw new NotFoundException('Floor not found');
    const isRoom = dto.space_category === 'Hostel_Room';
    const [rt] = isRoom ? await this.dbs.rows<{ sharing_count: number; is_ac: boolean }>(sql`select sharing_count, is_ac from hostel.room_type where room_type_id = ${dto.room_type_id ?? 0}`) : [undefined];
    if (isRoom && !rt) throw new NotFoundException('Choose a room type for hostel rooms');
    const created: string[] = [];
    await this.dbs.run(user, async (tx) => {
      for (const no of dto.room_nos) {
        const spaceId = `${z.hostel_code}-${no}`;
        const [dup] = (await tx.execute(sql`select 1 from infra.space where space_id = ${spaceId}`)) as unknown as unknown[];
        if (dup) throw new ConflictException(`Room ${no} already exists in ${z.hostel_code}`);
        await tx.execute(sql`insert into infra.space (space_id, zone_id, space_code, space_name, space_category, capacity, has_ac)
          values (${spaceId}, ${zoneId}, ${no}, ${isRoom ? `Room ${no}` : `${dto.space_category.replace(/_/g, ' ')} ${no}`}, ${dto.space_category}::infra.space_category, ${rt?.sharing_count ?? 0}, ${rt?.is_ac ?? false})`);
        if (isRoom && rt) {
          await tx.execute(sql`insert into hostel.room_profile (space_id, room_type_id, reserved_for, is_accessible, created_by) values (${spaceId}, ${dto.room_type_id}, ${dto.reserved_for ?? 'None'}::hostel.reserved_for, ${dto.is_accessible ?? false}, ${user.id})`);
          for (let b = 1; b <= rt.sharing_count; b++) await tx.execute(sql`insert into infra.subspace (subspace_id, space_id, subspace_code, subspace_type) values (${`${spaceId}-B${b}`}, ${spaceId}, ${String.fromCharCode(64 + b)}, 'Bed')`);
        }
        created.push(spaceId);
      }
    });
    return { created };
  }

  /* ---------- room types and fees ---------- */
  async addRoomType(user: AuthUser, dto: { type_name: string; sharing_count: number; is_ac: boolean; attached_bath?: boolean }) {
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.room_type (type_name, sharing_count, is_ac, attached_bath) values (${dto.type_name}, ${dto.sharing_count}, ${dto.is_ac}, ${dto.attached_bath ?? false})`));
    return { ok: true };
  }
  fees(year?: string) {
    return this.dbs.rows(sql`select f.fee_id::int as fee_id, f.room_type_id, rt.type_name, f.facility_id, hp.hostel_code, f.academic_year, f.registration_fee, f.hostel_fee, f.instalment_1_pct, f.instalment_2_due_date
      from hostel.room_type_fee f join hostel.room_type rt on rt.room_type_id = f.room_type_id join hostel.hostel_profile hp on hp.facility_id = f.facility_id
      where ${year ? sql`f.academic_year = ${year}` : sql`true`} order by f.academic_year desc, hp.hostel_code, rt.sharing_count, rt.type_name`);
  }
  async setFee(user: AuthUser, dto: { room_type_id: number; facility_id: string; academic_year: string; registration_fee: number; hostel_fee: number; instalment_1_pct: number; instalment_2_due_date: string }) {
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.room_type_fee (room_type_id, facility_id, academic_year, registration_fee, hostel_fee, instalment_1_pct, instalment_2_due_date)
      values (${dto.room_type_id}, ${dto.facility_id}, ${dto.academic_year}, ${dto.registration_fee}, ${dto.hostel_fee}, ${dto.instalment_1_pct}, ${dto.instalment_2_due_date}::date)
      on conflict (room_type_id, facility_id, academic_year) do update set registration_fee = excluded.registration_fee, hostel_fee = excluded.hostel_fee, instalment_1_pct = excluded.instalment_1_pct, instalment_2_due_date = excluded.instalment_2_due_date`));
    return { ok: true };
  }

  /* ---------- mess ---------- */
  messes() {
    return this.dbs.rows(sql`select m.mess_id::int as mess_id, m.mess_name, m.facility_id, f.facility_name, m.incharge_id, st.full_name as incharge_name, m.capacity, m.annual_fee, m.status
      from hostel.mess_master m left join infra.facility f on f.facility_id = m.facility_id left join ref.staff_master st on st.staff_id = m.incharge_id order by m.mess_name`);
  }
  async addMess(user: AuthUser, dto: { mess_name: string; facility_id: string; incharge_id?: string; capacity: number; annual_fee: number; make_default?: boolean }) {
    await this.dbs.run(user, async (tx) => {
      const r = (await tx.execute(sql`insert into hostel.mess_master (mess_name, facility_id, incharge_id, capacity, annual_fee) values (${dto.mess_name}, ${dto.facility_id}, ${dto.incharge_id || null}, ${dto.capacity}, ${dto.annual_fee}) returning mess_id`)) as unknown as { mess_id: number }[];
      if (dto.make_default !== false) await tx.execute(sql`update hostel.hostel_profile set default_mess_id = ${r[0].mess_id}, updated_by = ${user.id} where facility_id = ${dto.facility_id} and default_mess_id is null`);
    });
    return { ok: true };
  }

  /* ---------- people (ERP mirrors; manual entry fills gaps until the import runs) ---------- */
  departments() { return this.dbs.rows(sql`select dept_code, dept_name from ref.department order by dept_name`); }
  staffList(q?: string) {
    return this.dbs.rows(sql`select sm.staff_id, sm.full_name, sm.designation, sm.dept_code, sm.staff_type, sm.mobile_no, sm.official_email, sm.status,
        (select count(*)::int from hostel.staff_space_assignment a where a.staff_id = sm.staff_id and a.status = 'Active') as duties,
        (select string_agg(ur.role_code, ', ') from portal.app_user u join portal.user_role ur on ur.user_id = u.user_id where u.staff_id = sm.staff_id) as roles
      from ref.staff_master sm where ${q ? sql`(sm.staff_id ilike ${'%' + q + '%'} or sm.full_name ilike ${'%' + q + '%'})` : sql`true`} order by sm.full_name limit 200`);
  }
  async addStaff(user: AuthUser, dto: { staff_id: string; salutation?: string; first_name: string; last_name?: string; gender: string; dept_code: string; designation: string; staff_type: string; mobile_no: string; official_email?: string }) {
    await this.dbs.run(user, async (tx) => {
      await tx.execute(sql`insert into ref.staff_master (staff_id, salutation, first_name, last_name, gender, dept_code, designation, mobile_no, staff_type, official_email)
        values (${dto.staff_id}, ${dto.salutation || null}, ${dto.first_name}, ${dto.last_name || null}, ${dto.gender}::ref.gender, ${dto.dept_code}, ${dto.designation}, ${dto.mobile_no}, ${dto.staff_type}::ref.staff_type, ${dto.official_email || null})`);
      await tx.execute(sql`insert into portal.app_user (staff_id, full_name, email, title, home_dept) select staff_id, full_name, official_email, designation, dept_code from ref.staff_master where staff_id = ${dto.staff_id}`);
    });
    return { ok: true };
  }
  studentList(q?: string) {
    return this.dbs.rows(sql`select sm.student_id, sm.full_name, sm.gender, sm.programme, sm.student_type, sm.dept_code, sm.status, sm.is_hosteller,
        (select b.hostel_code || ' ' || b.room_code from hostel.hostel_allocation a join hostel.v_bed b on b.subspace_id = a.subspace_id where a.student_id = sm.student_id and a.status = 'Active' limit 1) as room,
        (select count(*)::int from hostel.student_contact c where c.student_id = sm.student_id and c.is_verified) as verified_contacts
      from ref.student_master sm where ${q ? sql`(sm.student_id ilike ${'%' + q + '%'} or sm.full_name ilike ${'%' + q + '%'})` : sql`true`} order by sm.student_id limit 200`);
  }
  async addStudent(user: AuthUser, dto: { student_id: string; full_name: string; gender: string; student_type: string; programme: string; date_of_birth: string; personal_email: string; dept_code?: string; father_name?: string; parent_mobile?: string }) {
    await this.dbs.run(user, async (tx) => {
      await tx.execute(sql`insert into ref.student_master (student_id, full_name, student_type, programme, gender, date_of_birth, personal_email, dept_code, father_name)
        values (${dto.student_id}, ${dto.full_name.toUpperCase()}, ${dto.student_type}::ref.student_type, ${dto.programme}, ${dto.gender}::ref.gender, ${dto.date_of_birth}::date, ${dto.personal_email}, ${dto.dept_code || null}, ${dto.father_name || null})`);
      if (dto.father_name && dto.parent_mobile) await tx.execute(sql`insert into hostel.student_contact (student_id, relation, contact_name, mobile_no, created_by) values (${dto.student_id}, 'Father', ${dto.father_name}, ${dto.parent_mobile}, ${user.id})`);
    });
    return { ok: true };
  }
}
