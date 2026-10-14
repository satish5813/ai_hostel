import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Duties the roster fills every day, and who may stand in when the mapped person is away (in order of preference). */
const COVER: Record<string, string[]> = {
  Warden: ['Warden', 'Assistant_Warden', 'Chief_Warden'],
  Floor_Warden: ['Floor_Warden', 'Assistant_Warden', 'Warden'],
  Sweeper: ['Sweeper', 'Cleaner', 'Scavenger'],
  Scavenger: ['Scavenger', 'Cleaner', 'Sweeper'],
  Security_Guard: ['Security_Guard', 'Security_Officer'],
};
export const ROSTER_ROLES = Object.keys(COVER);

type Asg = { staff_id: string; hostel_role: string; zone_id: string | null; space_id: string | null; shift: string };

/**
 * Staff attendance and the daily duty roster (MAP-06).
 * Each day the hostel marks who reported. The roster then gives every floor (Floor Manager, sweeper), every washroom
 * block (scavenger), the hostel (Warden) and each guard shift a person from those present, sharing the rooms equally
 * when fewer people than floors are present (see generate). A place stays Open only when nobody who can do it is in.
 */
@Injectable()
export class RosterService {
  constructor(private dbs: DbService) {}

  async day(facilityId: string, date: string) {
    const people = await this.dbs.rows(sql`
      select st.staff_id, st.full_name, st.mobile_no, st.designation, st.staff_type::text as staff_type,
        string_agg(distinct a.hostel_role, ', ' order by a.hostel_role) as roles,
        (array_agg(a.hostel_role order by array_position(array['Chief_Warden','Warden','Assistant_Warden','Floor_Warden','Security_Officer','Security_Guard','Housekeeping_Supervisor','Sweeper','Scavenger','Cleaner']::varchar[], a.hostel_role) nulls last))[1] as main_role,
        att.status::text as status, to_char(att.in_time, 'HH24:MI') as in_time, att.remarks, att.facility_id as marked_in,
        (select count(*)::int from hostel.daily_duty d where d.staff_id = st.staff_id and d.duty_date = ${date}::date) as duties
      from hostel.staff_space_assignment a join ref.staff_master st on st.staff_id = a.staff_id
      left join hostel.staff_attendance att on att.staff_id = st.staff_id and att.att_date = ${date}::date
      where a.facility_id = ${facilityId} and a.status = 'Active' and st.status = 'Active'
      group by st.staff_id, st.full_name, st.mobile_no, st.designation, st.staff_type, att.status, att.in_time, att.remarks, att.facility_id
      order by 7, st.full_name`);
    const duties = await this.dbs.rows(sql`
      select d.duty_id::int as duty_id, d.zone_id, z.zone_name, z.sequence_no::int as floor_no, d.space_id, s.space_code, s.space_name, d.hostel_role, d.shift::text as shift,
        d.staff_id, st.full_name, st.mobile_no, d.regular_staff_id, rs.full_name as regular_name, d.source::text as source,
        rf.space_code as room_from, rt.space_code as room_to, d.rooms::int as rooms
      from hostel.daily_duty d left join infra.zone z on z.zone_id = d.zone_id left join infra.space s on s.space_id = d.space_id
      left join ref.staff_master st on st.staff_id = d.staff_id left join ref.staff_master rs on rs.staff_id = d.regular_staff_id
      left join infra.space rf on rf.space_id = d.room_from left join infra.space rt on rt.space_id = d.room_to
      where d.facility_id = ${facilityId} and d.duty_date = ${date}::date
      order by array_position(array['Warden','Floor_Warden','Sweeper','Scavenger','Security_Guard']::varchar[], d.hostel_role), z.sequence_no nulls first, rf.space_code nulls first, s.space_code, d.shift`);
    const floors = await this.dbs.rows(sql`select z.zone_id, z.zone_name, z.sequence_no::int as floor_no,
        (select count(*)::int from hostel.v_bed b where b.zone_id = z.zone_id and b.bed_status = 'Occupied') as residents,
        (select count(*)::int from infra.space s where s.zone_id = z.zone_id and s.space_category = 'Hostel_Room' and s.status <> 'Decommissioned') as rooms
      from infra.zone z where z.facility_id = ${facilityId} order by z.sequence_no`);
    return { date, people, duties, floors };
  }

  /** Seven days from `from`: people present, absent, and places left open. */
  week(facilityId: string, from: string) {
    return this.dbs.rows(sql`
      select to_char(g.d, 'YYYY-MM-DD') as date,
        (select count(*)::int from hostel.staff_attendance a where a.att_date = g.d and a.facility_id = ${facilityId} and a.status in ('Present','Half_Day')) as present,
        (select count(*)::int from hostel.staff_attendance a where a.att_date = g.d and a.facility_id = ${facilityId} and a.status not in ('Present','Half_Day')) as away,
        (select count(*)::int from hostel.daily_duty d where d.duty_date = g.d and d.facility_id = ${facilityId}) as duties,
        (select count(*)::int from hostel.daily_duty d where d.duty_date = g.d and d.facility_id = ${facilityId} and d.source = 'Open') as open,
        (select count(*)::int from hostel.daily_duty d where d.duty_date = g.d and d.facility_id = ${facilityId} and d.source = 'Cover') as covers
      from generate_series(${from}::date, ${from}::date + 6, interval '1 day') g(d) order by g.d`);
  }

  mark(user: AuthUser, dto: { facility_id: string; date: string; marks: { staff_id: string; status: string; remarks?: string }[] }) {
    return this.dbs.run(user, async (tx) => {
      await tx.execute(sql`insert into hostel.staff_attendance (att_date, staff_id, facility_id, status, in_time, remarks, marked_by)
        select ${dto.date}::date, x.staff_id, ${dto.facility_id}, x.status::hostel.staff_day_status,
          case when x.status in ('Present','Half_Day') and ${dto.date}::date = current_date then localtime(0) end, x.remarks, ${user.id}
        from jsonb_to_recordset(${JSON.stringify(dto.marks)}::jsonb) as x(staff_id text, status text, remarks text)
        on conflict (att_date, staff_id) do update set status = excluded.status, facility_id = excluded.facility_id, remarks = excluded.remarks, marked_by = excluded.marked_by, marked_at = now(),
          in_time = coalesce(hostel.staff_attendance.in_time, excluded.in_time)`);
      return { marked: dto.marks.length };
    });
  }

  /**
   * Build the day's roster for one hostel. Manual changes made earlier for that day are kept.
   *   Warden and guard shifts: the mapped person when present, otherwise the least-loaded colleague who can stand in.
   *   Floor Managers and sweepers: with at least one person present per floor, each keeps their home floor and the
   *   others take the floors left; with fewer people than floors, all the rooms of the hostel, in floor and room order,
   *   are shared equally, each person taking one unbroken run of rooms (8 people and 200 rooms: 25 rooms each).
   *   Scavengers: washroom blocks the same way. A place stays Open only when nobody who can do it is present.
   */
  async generate(user: AuthUser, facilityId: string, date: string) {
    const rooms = await this.dbs.rows<{ space_id: string; space_code: string; zone_id: string }>(sql`select s.space_id, s.space_code, s.zone_id from infra.space s
      join infra.zone z on z.zone_id = s.zone_id where z.facility_id = ${facilityId} and s.space_category = 'Hostel_Room' and s.status <> 'Decommissioned'
      order by z.sequence_no, s.space_code`);
    const floors = [...new Set(rooms.map((r) => r.zone_id))];
    if (!floors.length) throw new NotFoundException('This hostel has no floors with rooms yet');
    const toilets = await this.dbs.rows<{ space_id: string; zone_id: string }>(sql`select s.space_id, s.zone_id from infra.space s join infra.zone z on z.zone_id = s.zone_id
      where z.facility_id = ${facilityId} and s.space_category = 'Toilet_Block' and s.status <> 'Decommissioned' order by z.sequence_no, s.space_code`);
    const asg = await this.dbs.rows<Asg>(sql`select a.staff_id, a.hostel_role, a.zone_id, a.space_id, a.shift::text as shift from hostel.staff_space_assignment a
      join ref.staff_master st on st.staff_id = a.staff_id where a.facility_id = ${facilityId} and a.status = 'Active' and st.status = 'Active'`);
    const present = new Set((await this.dbs.rows<{ staff_id: string }>(sql`select staff_id from hostel.staff_attendance where att_date = ${date}::date and status in ('Present','Half_Day')`)).map((r) => r.staff_id));
    const manual = await this.dbs.rows<{ zone_id: string | null; space_id: string | null; hostel_role: string; shift: string; staff_id: string | null }>(sql`
      select zone_id, space_id, hostel_role, shift::text as shift, staff_id from hostel.daily_duty where duty_date = ${date}::date and facility_id = ${facilityId} and source = 'Manual'`);
    // duties this person already has today in other hostels count towards the load
    const load = new Map<string, number>((await this.dbs.rows<{ staff_id: string; n: number }>(sql`select staff_id, count(*)::int as n from hostel.daily_duty
      where duty_date = ${date}::date and facility_id <> ${facilityId} and staff_id is not null group by staff_id`)).map((r) => [r.staff_id, r.n]));
    manual.forEach((m) => m.staff_id && load.set(m.staff_id, (load.get(m.staff_id) ?? 0) + 1));
    const bump = (id: string, n = 1) => load.set(id, (load.get(id) ?? 0) + n);
    const roleOf = new Map<string, Set<string>>();
    asg.forEach((a) => { if (!roleOf.has(a.staff_id)) roleOf.set(a.staff_id, new Set()); roleOf.get(a.staff_id)!.add(a.hostel_role); });
    const has = (id: string, role: string) => roleOf.get(id)?.has(role) ?? false;
    const floorNo = new Map(floors.map((z, i) => [z, i]));
    const roomsOn = (z: string) => rooms.filter((r) => r.zone_id === z);
    const manualKey = new Set(manual.map((m) => `${m.hostel_role}|${m.zone_id ?? ''}|${m.space_id ?? ''}|${m.shift}`));

    type Out = { hostel_role: string; zone_id: string | null; space_id: string | null; shift: string; staff_id: string | null; regular: string | null;
      source: 'Regular' | 'Cover' | 'Open'; room_from: string | null; room_to: string | null; rooms: number | null };
    const out: Out[] = [];
    /** Who may do this role today: its own people first; if none of them is present, those who can stand in. */
    const poolFor = (role: string) => {
      for (const r of COVER[role] ?? [role]) {
        const p = [...present].filter((id) => has(id, r));
        if (p.length) return p;
      }
      return [];
    };
    const homeOf = (id: string, role: string) => Math.min(...asg.filter((a) => a.staff_id === id && a.hostel_role === role && a.zone_id && floorNo.has(a.zone_id)).map((a) => floorNo.get(a.zone_id!)!), 999);
    const regularsOf = (role: string, zone: string | null, space: string | null) =>
      asg.filter((a) => a.hostel_role === role && (space ? a.space_id === space : !a.space_id && a.zone_id === zone)).map((a) => a.staff_id);

    // ---- Floor Managers and sweepers, by floor or by room range
    for (const role of ['Floor_Warden', 'Sweeper']) {
      const shift = role === 'Sweeper' ? 'Morning' : 'General';
      const fl = floors.filter((z) => !manualKey.has(`${role}|${z}||${shift}`) && !manualKey.has(`${role}|${z}||General`));
      const pool = poolFor(role).sort((a, b) => homeOf(a, role) - homeOf(b, role) || (load.get(a) ?? 0) - (load.get(b) ?? 0) || a.localeCompare(b));
      if (!pool.length) {
        fl.forEach((z) => out.push({ hostel_role: role, zone_id: z, space_id: null, shift, staff_id: null, regular: regularsOf(role, z, null)[0] ?? null, source: 'Open', room_from: null, room_to: null, rooms: roomsOn(z).length }));
        continue;
      }
      if (pool.length >= fl.length) {
        // one person per floor: the mapped person when present, then the nearest free colleague
        const free = new Set(pool);
        const left: string[] = [];
        for (const z of fl) {
          const reg = regularsOf(role, z, null).find((id) => free.has(id));
          if (reg) { free.delete(reg); out.push({ hostel_role: role, zone_id: z, space_id: null, shift, staff_id: reg, regular: reg, source: 'Regular', room_from: null, room_to: null, rooms: roomsOn(z).length }); bump(reg); }
          else left.push(z);
        }
        for (const z of left) {
          const who = [...free].sort((a, b) => Math.abs(homeOf(a, role) - floorNo.get(z)!) - Math.abs(homeOf(b, role) - floorNo.get(z)!) || (load.get(a) ?? 0) - (load.get(b) ?? 0))[0];
          free.delete(who); bump(who);
          out.push({ hostel_role: role, zone_id: z, space_id: null, shift, staff_id: who, regular: regularsOf(role, z, null)[0] ?? null, source: 'Cover', room_from: null, room_to: null, rooms: roomsOn(z).length });
        }
        continue;
      }
      // fewer people than floors: share the rooms equally, each person one unbroken run in floor and room order
      const list = rooms.filter((r) => fl.includes(r.zone_id));
      const base = Math.floor(list.length / pool.length), extra = list.length % pool.length;
      let at = 0;
      pool.forEach((id, i) => {
        const share = list.slice(at, at + base + (i < extra ? 1 : 0)); at += share.length;
        bump(id, share.length ? 1 : 0);
        for (const z of new Set(share.map((r) => r.zone_id))) {
          const part = share.filter((r) => r.zone_id === z), whole = part.length === roomsOn(z).length;
          const regs = regularsOf(role, z, null);
          out.push({ hostel_role: role, zone_id: z, space_id: null, shift, staff_id: id, regular: regs[0] ?? null, source: whole && regs.includes(id) ? 'Regular' : 'Cover',
            room_from: whole ? null : part[0].space_id, room_to: whole ? null : part[part.length - 1].space_id, rooms: part.length });
        }
      });
    }

    // ---- scavengers: washroom blocks shared out the same way
    const blocks = toilets.filter((t) => !manualKey.has(`Scavenger|${t.zone_id}|${t.space_id}|Morning`) && !manualKey.has(`Scavenger|${t.zone_id}|${t.space_id}|General`));
    const spool = poolFor('Scavenger').sort((a, b) => homeOf(a, 'Scavenger') - homeOf(b, 'Scavenger') || a.localeCompare(b));
    if (blocks.length) {
      const base = spool.length ? Math.floor(blocks.length / spool.length) : 0, extra = spool.length ? blocks.length % spool.length : 0;
      const free = new Set(spool);
      // the mapped person keeps their own block when present and when there are enough people
      const mine = new Map<string, string>();
      if (spool.length >= blocks.length) blocks.forEach((b) => { const reg = regularsOf('Scavenger', b.zone_id, b.space_id).find((id) => free.has(id)); if (reg) { mine.set(b.space_id, reg); free.delete(reg); } });
      let at = 0;
      const order = spool.length >= blocks.length ? [...free] : spool;
      const rest = blocks.filter((b) => !mine.has(b.space_id));
      const give = new Map<string, string>(mine);
      if (spool.length >= blocks.length) rest.forEach((b, i) => give.set(b.space_id, order[i]));
      else spool.forEach((id, i) => { rest.slice(at, at + base + (i < extra ? 1 : 0)).forEach((b) => give.set(b.space_id, id)); at += base + (i < extra ? 1 : 0); });
      for (const b of blocks) {
        const who = give.get(b.space_id) ?? null, regs = regularsOf('Scavenger', b.zone_id, b.space_id);
        if (who) bump(who);
        out.push({ hostel_role: 'Scavenger', zone_id: b.zone_id, space_id: b.space_id, shift: 'Morning', staff_id: who, regular: regs[0] ?? null,
          source: !who ? 'Open' : regs.includes(who) ? 'Regular' : 'Cover', room_from: null, room_to: null, rooms: null });
      }
    }

    // ---- the Warden and the guard shifts: the mapped person, else the least-loaded colleague who can stand in
    const single: { hostel_role: string; shift: string }[] = [{ hostel_role: 'Warden', shift: 'General' }, ...['Morning', 'Evening', 'Night'].map((sh) => ({ hostel_role: 'Security_Guard', shift: sh }))];
    for (const sl of single.filter((x) => !manualKey.has(`${x.hostel_role}|||${x.shift}`))) {
      const regs = asg.filter((a) => a.hostel_role === sl.hostel_role && !a.zone_id && !a.space_id && (a.shift === 'General' || a.shift === sl.shift)).map((a) => a.staff_id);
      let who = regs.find((id) => present.has(id) && !out.some((o) => o.staff_id === id && o.hostel_role === sl.hostel_role)) ?? null;
      const source: Out['source'] = who ? 'Regular' : 'Cover';
      if (!who) who = poolFor(sl.hostel_role).sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0) || a.localeCompare(b))[0] ?? null;
      if (who) bump(who);
      out.push({ ...sl, zone_id: null, space_id: null, staff_id: who, regular: regs[0] ?? null, source: who ? source : 'Open', room_from: null, room_to: null, rooms: null });
    }

    return this.dbs.run(user, async (tx) => {
      await tx.execute(sql`delete from hostel.daily_duty where duty_date = ${date}::date and facility_id = ${facilityId} and source <> 'Manual'`);
      if (out.length) {
        await tx.execute(sql`insert into hostel.daily_duty (duty_date, facility_id, zone_id, space_id, hostel_role, shift, staff_id, regular_staff_id, source, room_from, room_to, rooms, created_by)
          select ${date}::date, ${facilityId}, x.zone_id, x.space_id, x.hostel_role, x.shift::hostel.shift, x.staff_id, x.regular, x.source::hostel.duty_source, x.room_from, x.room_to, x.rooms, ${user.id}
          from jsonb_to_recordset(${JSON.stringify(out)}::jsonb) as x(zone_id text, space_id text, hostel_role text, shift text, staff_id text, regular text, source text, room_from text, room_to text, rooms int)`);
      }
      const people = (role: string) => new Set(out.filter((o) => o.hostel_role === role && o.staff_id).map((o) => o.staff_id)).size;
      return { places: out.length + manual.length, regular: out.filter((o) => o.source === 'Regular').length, cover: out.filter((o) => o.source === 'Cover').length,
        open: out.filter((o) => o.source === 'Open').length, kept: manual.length, split: out.some((o) => o.room_from),
        floor_wardens: people('Floor_Warden'), sweepers: people('Sweeper'), scavengers: people('Scavenger'), floors: floors.length, rooms: rooms.length };
    });
  }

  /** Change one place by hand; it is kept when the roster is built again. */
  async setDuty(user: AuthUser, dutyId: number, staffId: string | null) {
    return this.dbs.run(user, async (tx) => {
      const r = (await tx.execute(sql`update hostel.daily_duty set staff_id = ${staffId}, source = ${staffId ? 'Manual' : 'Open'}::hostel.duty_source, updated_by = ${user.id}, updated_at = now()
        where duty_id = ${dutyId} returning duty_id`)) as unknown as unknown[];
      if (!r.length) throw new NotFoundException('Duty not found');
      return { duty_id: dutyId };
    });
  }

  /** Mapping centre: how complete the mapping of each hostel is. */
  summary() {
    return this.dbs.rows(sql`
      select hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender::text as hostel_gender,
        (select count(*)::int from hostel.v_bed b where b.facility_id = hp.facility_id) as beds,
        (select count(*)::int from hostel.v_bed b where b.facility_id = hp.facility_id and b.occupant_type = 'Student') as students,
        (select count(distinct z.zone_id)::int from infra.zone z join infra.space s on s.zone_id = z.zone_id and s.space_category = 'Hostel_Room' where z.facility_id = hp.facility_id) as floors,
        (select count(distinct a.zone_id)::int from hostel.staff_space_assignment a where a.facility_id = hp.facility_id and a.status = 'Active' and a.hostel_role = 'Floor_Warden' and a.zone_id is not null) as floors_warden,
        (select count(distinct a.zone_id)::int from hostel.staff_space_assignment a where a.facility_id = hp.facility_id and a.status = 'Active' and a.hostel_role in ('Sweeper','Cleaner') and a.zone_id is not null) as floors_sweeper,
        (select count(*)::int from infra.space s join infra.zone z on z.zone_id = s.zone_id where z.facility_id = hp.facility_id and s.space_category = 'Toilet_Block') as washrooms,
        (select count(distinct a.space_id)::int from hostel.staff_space_assignment a join infra.space s on s.space_id = a.space_id and s.space_category = 'Toilet_Block'
          where a.facility_id = hp.facility_id and a.status = 'Active' and a.hostel_role in ('Scavenger','Cleaner')) as washrooms_scavenger,
        (select count(*)::int from hostel.staff_space_assignment a where a.facility_id = hp.facility_id and a.status = 'Active' and a.hostel_role in ('Chief_Warden','Warden','Assistant_Warden')) as wardens,
        (select case when bool_or(a.shift = 'General') then 3 else least(3, count(distinct a.shift)) end::int from hostel.staff_space_assignment a where a.facility_id = hp.facility_id and a.status = 'Active' and a.hostel_role = 'Security_Guard') as guard_shifts
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id order by hp.hostel_code`);
  }
}
