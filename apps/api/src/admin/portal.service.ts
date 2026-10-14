import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

export type BuildDto = { floors: number; ground: boolean; rooms_per_floor: number; ranges: { from: number; to: number; room_type_id: number }[]; dry_run: boolean };
type Check = { key: string; label: string; ok: boolean; detail: string; blocks: boolean; fix: string };
const LOGIN_ROLES = ['Chief_Warden', 'Room_Allotment'] as const;
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Administrator portal (Stage 1 of docs/flow-a-to-f.html): the room builder, the readiness check that decides whether
 * registration can open, and the Chief Manager and Room Allotment logins with their hostels (decision D7).
 */
@Injectable()
export class PortalService {
  constructor(private dbs: DbService) {}

  /* ---------- room builder ---------- */

  /**
   * Generates the floors, rooms and beds of a hostel from a pattern. Room numbers follow decision D8: the floor, then two
   * digits (G01 on the ground floor, 101 on floor 1, 1207 on floor 12); beds are lettered. Rooms that exist are left alone.
   */
  async build(user: AuthUser, facilityId: string, dto: BuildDto) {
    const [h] = await this.dbs.rows<{ hostel_code: string; facility_name: string }>(sql`
      select hp.hostel_code, f.facility_name from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id where hp.facility_id = ${facilityId}`);
    if (!h) throw new NotFoundException('Hostel not found');
    const ranges = [...dto.ranges].sort((a, b) => a.from - b.from);
    for (const [i, r] of ranges.entries()) {
      if (r.from < 1 || r.to > dto.rooms_per_floor || r.to < r.from) throw new BadRequestException(`Rooms ${pad2(r.from)} to ${pad2(r.to)} are outside 01 to ${pad2(dto.rooms_per_floor)}`);
      if (i && r.from <= ranges[i - 1].to) throw new BadRequestException(`Rooms ${pad2(r.from)} to ${pad2(ranges[i - 1].to)} are given two room types`);
    }
    const types = await this.dbs.rows<{ room_type_id: number; type_name: string; sharing_count: number; is_ac: boolean }>(sql`
      select room_type_id::int as room_type_id, type_name, sharing_count::int as sharing_count, is_ac from hostel.room_type
      where room_type_id = any(string_to_array(${ranges.map((r) => r.room_type_id).join(',')}, ',')::int[])`);
    const typeOf = new Map(types.map((t) => [t.room_type_id, t]));
    for (const r of ranges) if (!typeOf.has(r.room_type_id)) throw new BadRequestException(`Room type ${r.room_type_id} does not exist`);

    const seqs = Array.from({ length: dto.floors }, (_, i) => (dto.ground ? i : i + 1));
    const floors = seqs.map((s) => ({ zone_id: `${h.hostel_code}-F${s === 0 ? 'G' : s}`, zone_name: s === 0 ? 'Ground floor' : `Floor ${s}`, sequence_no: s, code: s === 0 ? 'G' : String(s) }));
    const zones = await this.dbs.rows<{ zone_id: string; sequence_no: number }>(sql`select zone_id, sequence_no from infra.zone where facility_id = ${facilityId}`);
    const zoneBySeq = new Map(zones.map((z) => [Number(z.sequence_no), z.zone_id]));
    const existing = new Set((await this.dbs.rows<{ space_id: string }>(sql`
      select s.space_id from infra.space s join infra.zone z on z.zone_id = s.zone_id where z.facility_id = ${facilityId}`)).map((r) => r.space_id));

    const newZones = floors.filter((f) => !zoneBySeq.has(f.sequence_no)).map((f) => ({ zone_id: f.zone_id, facility_id: facilityId, zone_name: f.zone_name, sequence_no: f.sequence_no }));
    const rooms: { space_id: string; zone_id: string; space_code: string; room_type_id: number; sharing: number; is_ac: boolean; floor: string }[] = [];
    let skipped = 0;
    for (const f of floors) {
      const zoneId = zoneBySeq.get(f.sequence_no) ?? f.zone_id;
      for (const r of ranges) for (let p = r.from; p <= r.to; p++) {
        const code = `${f.code}${pad2(p)}`; const spaceId = `${h.hostel_code}-${code}`;
        if (existing.has(spaceId)) { skipped++; continue; }
        const t = typeOf.get(r.room_type_id)!;
        rooms.push({ space_id: spaceId, zone_id: zoneId, space_code: code, room_type_id: t.room_type_id, sharing: t.sharing_count, is_ac: t.is_ac, floor: f.zone_name });
      }
    }
    const byType = types.map((t) => {
      const n = rooms.filter((r) => r.room_type_id === t.room_type_id).length;
      return { room_type_id: t.room_type_id, type_name: t.type_name, rooms: n, beds: n * t.sharing_count };
    }).filter((x) => x.rooms);
    const plan = {
      hostel: h.hostel_code, floors: floors.map((f) => ({ name: f.zone_name, first: `${f.code}${pad2(ranges[0]?.from ?? 1)}`, last: `${f.code}${pad2(ranges.at(-1)?.to ?? dto.rooms_per_floor)}`, exists: zoneBySeq.has(f.sequence_no) })),
      new_floors: newZones.length, new_rooms: rooms.length, new_beds: rooms.reduce((a, r) => a + r.sharing, 0), skipped, by_type: byType,
      unused_positions: dto.rooms_per_floor - ranges.reduce((a, r) => a + r.to - r.from + 1, 0),
    };
    if (dto.dry_run || (!rooms.length && !newZones.length)) return { ...plan, built: false };

    await this.dbs.run(user, async (tx) => {
      if (newZones.length) await tx.execute(sql`
        insert into infra.zone (zone_id, facility_id, zone_name, zone_type, sequence_no)
        select zone_id, facility_id, zone_name, 'Floor', sequence_no from jsonb_to_recordset(${JSON.stringify(newZones)}::jsonb)
          as x(zone_id varchar, facility_id varchar, zone_name varchar, sequence_no int)`);
      if (rooms.length) {
        const j = JSON.stringify(rooms);
        await tx.execute(sql`
          insert into infra.space (space_id, zone_id, space_code, space_name, space_category, capacity, has_ac)
          select space_id, zone_id, space_code, 'Room ' || space_code, 'Hostel_Room', sharing, is_ac
          from jsonb_to_recordset(${j}::jsonb) as x(space_id varchar, zone_id varchar, space_code varchar, sharing int, is_ac boolean)`);
        await tx.execute(sql`
          insert into hostel.room_profile (space_id, room_type_id, reserved_for, is_accessible, created_by)
          select space_id, room_type_id, 'None', false, ${user.id} from jsonb_to_recordset(${j}::jsonb) as x(space_id varchar, room_type_id int)`);
        await tx.execute(sql`
          insert into infra.subspace (subspace_id, space_id, subspace_code, subspace_type)
          select x.space_id || '-B' || n, x.space_id, chr(64 + n), 'Bed'
          from jsonb_to_recordset(${j}::jsonb) as x(space_id varchar, sharing int), generate_series(1, x.sharing) n`);
      }
      await tx.execute(sql`update infra.facility set no_of_floors = (select count(*) from infra.zone where facility_id = ${facilityId}) where facility_id = ${facilityId}`);
    });
    return { ...plan, built: true };
  }

  /* ---------- readiness: what stops registration from opening ---------- */

  async readiness() {
    const [g] = await this.dbs.rows<{ year: string | null; opens: string | null; closes: string | null; open_now: boolean; outing_rules: number; sick_rules: number; deans: number; messes: number }>(sql`
      select y.academic_year as year, y.registration_opens as opens, y.registration_closes as closes,
             coalesce(current_date between y.registration_opens and y.registration_closes, false) as open_now,
             (select count(*)::int from shared.approval_rule where request_type = 'Outpass' and status = 'Active') as outing_rules,
             (select count(*)::int from shared.approval_rule where request_type = 'Sick_Leave' and status = 'Active') as sick_rules,
             (select count(*)::int from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id and u.active where ur.role_code = 'Dean_Students_Affairs') as deans,
             (select count(*)::int from hostel.mess_master) as messes
      from (select 1) one left join hostel.academic_year y on y.is_current`);
    const rows = await this.dbs.rows<Record<string, unknown> & { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string }>(sql`
      with cy as (select academic_year from hostel.academic_year where is_current)
      select hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender::text as hostel_gender,
        (select count(*)::int from infra.zone z where z.facility_id = hp.facility_id) as floors,
        (select count(*)::int from infra.space s join infra.zone z on z.zone_id = s.zone_id where z.facility_id = hp.facility_id and s.space_category = 'Hostel_Room') as rooms,
        (select count(*)::int from hostel.v_bed b where b.facility_id = hp.facility_id) as beds,
        (select count(*)::int from infra.space s join infra.zone z on z.zone_id = s.zone_id left join hostel.room_profile rp on rp.space_id = s.space_id
          where z.facility_id = hp.facility_id and s.space_category = 'Hostel_Room' and rp.room_type_id is null) as rooms_without_type,
        (select string_agg(distinct rt.type_name, ', ') from hostel.v_bed b join hostel.room_type rt on rt.room_type_id = b.room_type_id
          where b.facility_id = hp.facility_id and not exists (select 1 from hostel.room_type_fee fee, cy where fee.facility_id = hp.facility_id and fee.room_type_id = b.room_type_id and fee.academic_year = cy.academic_year)) as types_without_fee,
        hp.default_mess_id is not null as has_mess,
        (select count(distinct a.staff_id)::int from hostel.staff_space_assignment a where a.facility_id = hp.facility_id and a.hostel_role = 'Chief_Warden' and a.status = 'Active'
          and exists (select 1 from portal.app_user u join portal.user_role ur on ur.user_id = u.user_id where u.staff_id = a.staff_id and u.active and ur.role_code = 'Chief_Warden')) as chief_wardens,
        (select count(distinct a.staff_id)::int from hostel.staff_space_assignment a where a.facility_id = hp.facility_id and a.hostel_role in ('Room_Allotment', 'Office_Staff') and a.status = 'Active'
          and exists (select 1 from portal.app_user u join portal.user_role ur on ur.user_id = u.user_id where u.staff_id = a.staff_id and u.active and ur.role_code in ('Room_Allotment', 'Office_Staff'))) as allotment_staff,
        (select count(*)::int from infra.zone z where z.facility_id = hp.facility_id and exists (select 1 from hostel.v_bed b where b.zone_id = z.zone_id)
          and not exists (select 1 from hostel.staff_space_assignment a where a.zone_id = z.zone_id and a.hostel_role = 'Floor_Warden' and a.status = 'Active')) as floors_without_warden,
        (select count(*)::int from infra.space s join infra.zone z on z.zone_id = s.zone_id where z.facility_id = hp.facility_id and s.space_category = 'Hostel_Room'
          and not exists (select 1 from hostel.room_meter m where m.space_id = s.space_id and m.status = 'Active')) as rooms_without_meter,
        (select string_agg(distinct rt.type_name, ', ') from hostel.v_bed b join hostel.room_type rt on rt.room_type_id = b.room_type_id
          where b.facility_id = hp.facility_id and not exists (select 1 from hostel.electricity_tariff t where t.room_type_id = b.room_type_id and t.approved_by is not null
            and t.effective_from <= current_date and (t.effective_to is null or t.effective_to >= current_date))) as types_without_tariff,
        (select count(*)::int from hostel.capture_point c where c.facility_id = hp.facility_id and c.point_type = 'Hostel_Gate' and c.status = 'Active') as gates,
        (select count(*)::int from infra.space s join infra.zone z on z.zone_id = s.zone_id where z.facility_id = hp.facility_id and s.space_category = 'Hostel_Room'
          and not exists (select 1 from hostel.space_qr q where q.space_id = s.space_id and q.status = 'Active')) as rooms_without_qr
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id order by hp.hostel_code`);

    const n = (v: unknown) => Number(v ?? 0);
    const hostels = rows.map((r) => {
      const checks: Check[] = [
        { key: 'rooms', label: 'Rooms and beds', ok: n(r.beds) > 0, detail: `${n(r.floors)} floors, ${n(r.rooms)} rooms, ${n(r.beds)} beds`, blocks: true, fix: '/admin/room-builder' },
        { key: 'types', label: 'Every room has a room type', ok: n(r.rooms_without_type) === 0, detail: n(r.rooms_without_type) ? `${n(r.rooms_without_type)} rooms have no type` : 'All typed', blocks: true, fix: '/rooms' },
        { key: 'fees', label: `Fees for ${g?.year ?? 'the current year'}`, ok: !r.types_without_fee && n(r.beds) > 0, detail: r.types_without_fee ? `No fee for ${r.types_without_fee}` : 'Every room type has a fee', blocks: true, fix: '/admin/data/fees' },
        { key: 'mess', label: 'Default mess', ok: !!r.has_mess, detail: r.has_mess ? 'Set' : 'No mess: the fee plan cannot raise the mess fee', blocks: true, fix: '/admin/masters?tab=years' },
        { key: 'cw', label: 'Chief Manager login', ok: n(r.chief_wardens) > 0, detail: n(r.chief_wardens) ? `${n(r.chief_wardens)} with a login` : 'No Chief Manager login: nobody can give the final approval', blocks: true, fix: '/admin/logins' },
        { key: 'ra', label: 'Room Allotment login', ok: n(r.allotment_staff) > 0, detail: n(r.allotment_staff) ? `${n(r.allotment_staff)} with a login` : 'No Room Allotment login: nobody can verify fees or check students in', blocks: true, fix: '/admin/logins' },
        { key: 'fw', label: 'Floor Manager on every floor', ok: n(r.floors_without_warden) === 0, detail: n(r.floors_without_warden) ? `${n(r.floors_without_warden)} floors without one` : 'Every floor covered', blocks: false, fix: '/mapping' },
        { key: 'meters', label: 'Meter in every room', ok: n(r.rooms_without_meter) === 0, detail: n(r.rooms_without_meter) ? `${n(r.rooms_without_meter)} rooms without a meter` : 'All metered', blocks: false, fix: '/meters' },
        { key: 'tariff', label: 'Approved electricity tariff', ok: !r.types_without_tariff, detail: r.types_without_tariff ? `None for ${r.types_without_tariff}` : 'In force', blocks: false, fix: '/tariff' },
        { key: 'gate', label: 'Hostel gate registered', ok: n(r.gates) > 0, detail: n(r.gates) ? `${n(r.gates)} gate point(s)` : 'No gate point', blocks: false, fix: '/capture-points' },
        { key: 'qr', label: 'QR label on every room', ok: n(r.rooms_without_qr) === 0, detail: n(r.rooms_without_qr) ? `${n(r.rooms_without_qr)} rooms without a label` : 'All labelled', blocks: false, fix: '/qr-labels' },
      ];
      const blockers = checks.filter((c) => c.blocks && !c.ok).length, warnings = checks.filter((c) => !c.blocks && !c.ok).length;
      return { facility_id: r.facility_id, hostel_code: r.hostel_code, facility_name: r.facility_name, hostel_gender: r.hostel_gender, beds: n(r.beds), ready: blockers === 0, blockers, warnings, checks };
    });
    const global: Check[] = [
      { key: 'year', label: 'Current academic year', ok: !!g?.year, detail: g?.year ?? 'None set', blocks: true, fix: '/admin/masters?tab=years' },
      { key: 'window', label: 'Registration window', ok: !!g?.opens, detail: g?.opens ? `${g.opens} to ${g.closes}${g.open_now ? ' (open now)' : ' (closed today)'}` : 'Not set: students cannot apply', blocks: true, fix: '/admin/masters?tab=years' },
      { key: 'rules', label: 'Approval rules for outings and sick leave', ok: n(g?.outing_rules) > 0 && n(g?.sick_rules) > 0, detail: `${n(g?.outing_rules)} outing, ${n(g?.sick_rules)} sick-leave levels`, blocks: false, fix: '/admin/settings' },
      { key: 'dean', label: 'Dean, Students Affairs (for long outings)', ok: n(g?.deans) > 0, detail: n(g?.deans) ? `${n(g?.deans)} named` : 'Nobody receives the link: outings of a day or more will wait', blocks: false, fix: '/admin/users' },
    ];
    return { year: g?.year ?? null, window: { opens: g?.opens ?? null, closes: g?.closes ?? null, open_now: !!g?.open_now }, global, hostels };
  }

  /* ---------- Chief Manager and Room Allotment logins with their hostels (D7) ---------- */

  logins() {
    return this.dbs.rows(sql`
      select u.user_id::int as user_id, u.staff_id, initcap(coalesce(st.full_name, u.full_name)) as full_name, st.designation, st.mobile_no, u.active,
             case when ur.role_code = 'Office_Staff' then 'Room_Allotment' else ur.role_code end as role, ur.approval_ref, ur.granted_on, ur.granted_by,
             coalesce((select array_agg(distinct a.facility_id order by a.facility_id) from hostel.staff_space_assignment a
                        where a.staff_id = u.staff_id and a.status = 'Active' and a.zone_id is null and a.space_id is null
                          and (a.hostel_role = ur.role_code or (ur.role_code in ('Room_Allotment', 'Office_Staff') and a.hostel_role in ('Room_Allotment', 'Office_Staff')))), '{}') as facilities
      from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id left join ref.staff_master st on st.staff_id = u.staff_id
      where ur.role_code in ('Chief_Warden', 'Room_Allotment', 'Office_Staff') and u.staff_id is not null
      order by 7, 3`);
  }

  async saveLogin(user: AuthUser, dto: { staff_id: string; role: (typeof LOGIN_ROLES)[number]; facility_ids: string[]; approval_ref: string }) {
    if (dto.staff_id === user.id) throw new ForbiddenException('A role cannot be given to oneself');
    const [st] = await this.dbs.rows<{ full_name: string; official_email: string | null; designation: string | null; dept_code: string | null }>(sql`
      select full_name, official_email, designation, dept_code from ref.staff_master where staff_id = ${dto.staff_id}`);
    if (!st) throw new NotFoundException(`No staff member ${dto.staff_id}`);
    const known = await this.dbs.rows<{ facility_id: string }>(sql`select facility_id from hostel.hostel_profile`);
    const bad = dto.facility_ids.filter((f) => !known.some((k) => k.facility_id === f));
    if (bad.length) throw new BadRequestException(`Unknown hostel ${bad.join(', ')}`);
    await this.dbs.run(user, async (tx) => {
      await tx.execute(sql`insert into portal.app_user (staff_id, full_name, email, title, home_dept)
        select ${dto.staff_id}, ${st.full_name}, ${st.official_email}, ${st.designation}, ${st.dept_code}
        where not exists (select 1 from portal.app_user where staff_id = ${dto.staff_id})`);
      await tx.execute(sql`insert into portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref)
        select user_id, ${dto.role}, 'HOSTELS', ${user.id}, ${dto.approval_ref} from portal.app_user where staff_id = ${dto.staff_id}
        on conflict (user_id, role_code, scope_dept) do update set approval_ref = excluded.approval_ref, granted_by = excluded.granted_by, granted_on = current_date`);
      await tx.execute(sql`update portal.app_user set active = true where staff_id = ${dto.staff_id}`);
      await this.syncHostels(tx, user, dto.staff_id, dto.role, dto.facility_ids);
    });
    return { ok: true };
  }

  async disableLogin(user: AuthUser, staffId: string, role: (typeof LOGIN_ROLES)[number]) {
    if (staffId === user.id) throw new ForbiddenException('Your own roles are changed by another administrator');
    await this.dbs.run(user, async (tx) => {
      await this.syncHostels(tx, user, staffId, role, []);
      await tx.execute(sql`delete from portal.user_role ur using portal.app_user u where u.user_id = ur.user_id and u.staff_id = ${staffId}
        and ur.role_code in (${role}, ${role === 'Room_Allotment' ? 'Office_Staff' : role})`);
    });
    return { ok: true };
  }

  /** Hostel-wide assignments of the role match the list: missing ones start today, others end (yesterday, or today if they began today). */
  private async syncHostels(tx: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> }, user: AuthUser, staffId: string, role: string, facilityIds: string[]) {
    const roles = role === 'Room_Allotment' ? ['Room_Allotment', 'Office_Staff'] : [role];
    const list = facilityIds.join(',');
    await tx.execute(sql`update hostel.staff_space_assignment set status = 'Ended', to_date = greatest(from_date, current_date - 1), updated_by = ${user.id}, updated_at = now()
      where staff_id = ${staffId} and hostel_role = any(string_to_array(${roles.join(',')}, ',')) and status = 'Active' and zone_id is null and space_id is null
        and not (facility_id = any(string_to_array(${list}, ',')))`);
    await tx.execute(sql`update hostel.staff_space_assignment a set status = 'Active', to_date = null, updated_by = ${user.id}, updated_at = now()
      where a.staff_id = ${staffId} and a.hostel_role = ${role} and a.zone_id is null and a.space_id is null and a.shift = 'General' and a.status = 'Ended' and a.to_date >= current_date
        and a.facility_id = any(string_to_array(${list}, ','))
        and not exists (select 1 from hostel.staff_space_assignment b where b.staff_id = a.staff_id and b.facility_id = a.facility_id and b.status = 'Active'
                          and b.hostel_role = any(string_to_array(${roles.join(',')}, ',')) and b.zone_id is null and b.space_id is null)`);
    await tx.execute(sql`insert into hostel.staff_space_assignment (staff_id, hostel_role, facility_id, shift, from_date, show_on_qr, created_by)
      select ${staffId}, ${role}, f, 'General', current_date, ${role === 'Chief_Warden'}, ${user.id} from unnest(string_to_array(${list}, ',')) f
      where f <> '' and not exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${staffId} and a.facility_id = f and a.status = 'Active'
                                     and a.hostel_role = any(string_to_array(${roles.join(',')}, ',')) and a.zone_id is null and a.space_id is null)`);
  }

  /* ---------- registration window ---------- */

  async setRenewalWindow(user: AuthUser, year: string, dto: { opens: string | null; closes: string | null }) {
    if (dto.opens && dto.closes && dto.closes < dto.opens) throw new BadRequestException('The window closes before it opens');
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.academic_year set renewal_opens = ${dto.opens}::date, renewal_closes = ${dto.closes}::date
      where academic_year = ${year} returning academic_year`));
    if (!(r as unknown as unknown[]).length) throw new NotFoundException('Academic year not found');
    return { ok: true };
  }

  async setWindow(user: AuthUser, year: string, dto: { opens: string | null; closes: string | null }) {
    if (dto.opens && dto.closes && dto.closes < dto.opens) throw new BadRequestException('The window closes before it opens');
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.academic_year set registration_opens = ${dto.opens}::date, registration_closes = ${dto.closes}::date
      where academic_year = ${year} returning academic_year`));
    if (!(r as unknown as unknown[]).length) throw new NotFoundException('Academic year not found');
    return { ok: true };
  }
}
