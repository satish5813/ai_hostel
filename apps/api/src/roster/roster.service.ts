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
const MAX_LOAD = 4;   // places one person can be given in a day

type Slot = { zone_id: string | null; space_id: string | null; hostel_role: string; shift: string; regulars: string[] };
type Asg = { staff_id: string; hostel_role: string; zone_id: string | null; space_id: string | null; shift: string };

/**
 * Staff attendance and the daily duty roster (MAP-06).
 * Each day the hostel marks who reported. The roster then gives every floor (Floor Warden, sweeper), every washroom
 * block (scavenger), the hostel (Warden) and each guard shift a person: the mapped person when present, otherwise the
 * least-loaded present colleague who can stand in. Places nobody can cover stay Open and are shown in red.
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
        d.staff_id, st.full_name, st.mobile_no, d.regular_staff_id, rs.full_name as regular_name, d.source::text as source
      from hostel.daily_duty d left join infra.zone z on z.zone_id = d.zone_id left join infra.space s on s.space_id = d.space_id
      left join ref.staff_master st on st.staff_id = d.staff_id left join ref.staff_master rs on rs.staff_id = d.regular_staff_id
      where d.facility_id = ${facilityId} and d.duty_date = ${date}::date
      order by array_position(array['Warden','Floor_Warden','Sweeper','Scavenger','Security_Guard']::varchar[], d.hostel_role), z.sequence_no nulls first, s.space_code, d.shift`);
    const floors = await this.dbs.rows(sql`select z.zone_id, z.zone_name, z.sequence_no::int as floor_no,
        (select count(*)::int from hostel.v_bed b where b.zone_id = z.zone_id and b.bed_status = 'Occupied') as residents
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

  /** Build the day's roster for one hostel. Manual changes made earlier for that day are kept. */
  async generate(user: AuthUser, facilityId: string, date: string) {
    const floors = await this.dbs.rows<{ zone_id: string }>(sql`select distinct z.zone_id, z.sequence_no from infra.zone z join infra.space s on s.zone_id = z.zone_id
      where z.facility_id = ${facilityId} and s.space_category = 'Hostel_Room' order by z.sequence_no`);
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

    // the places to fill
    const slots: Slot[] = [];
    const add = (hostel_role: string, zone_id: string | null, space_id: string | null, shift: string) => slots.push({ hostel_role, zone_id, space_id, shift, regulars: [] });
    add('Warden', null, null, 'General');
    floors.forEach((f) => { add('Floor_Warden', f.zone_id, null, 'General'); add('Sweeper', f.zone_id, null, 'Morning'); });
    toilets.forEach((t) => add('Scavenger', t.zone_id, t.space_id, 'Morning'));
    ['Morning', 'Evening', 'Night'].forEach((sh) => add('Security_Guard', null, null, sh));
    for (const a of asg.filter((x) => ROSTER_ROLES.includes(x.hostel_role))) {
      const fits = (s: Slot) => s.hostel_role === a.hostel_role && (a.space_id ? s.space_id === a.space_id : !s.space_id && s.zone_id === a.zone_id) && (a.shift === 'General' || a.shift === s.shift);
      const hit = slots.filter(fits);
      if (hit.length) hit.forEach((s) => s.regulars.push(a.staff_id));
      else slots.push({ hostel_role: a.hostel_role, zone_id: a.zone_id, space_id: a.space_id, shift: a.shift, regulars: [a.staff_id] });
    }
    const key = (s: { zone_id: string | null; space_id: string | null; hostel_role: string; shift: string }) => `${s.hostel_role}|${s.zone_id ?? ''}|${s.space_id ?? ''}|${s.shift}`;
    const manualKeys = new Set(manual.map(key));
    const open = slots.filter((s) => !manualKeys.has(key(s)));

    type Out = Slot & { staff_id: string | null; regular: string | null; source: 'Regular' | 'Cover' | 'Open' };
    const out: Out[] = [];
    const bump = (id: string) => load.set(id, (load.get(id) ?? 0) + 1);
    // 1. the mapped person, when present
    for (const s of open) {
      const who = s.regulars.find((r) => present.has(r));
      if (who) { out.push({ ...s, staff_id: who, regular: who, source: 'Regular' }); bump(who); }
    }
    // 2. a present colleague who can stand in, least loaded first
    const roleOf = new Map<string, Set<string>>();
    asg.forEach((a) => { if (!roleOf.has(a.staff_id)) roleOf.set(a.staff_id, new Set()); roleOf.get(a.staff_id)!.add(a.hostel_role); });
    for (const s of open.filter((x) => !out.some((o) => key(o) === key(x)))) {
      const prefs = COVER[s.hostel_role] ?? [s.hostel_role];
      const pool = [...present].filter((id) => roleOf.has(id) && prefs.some((p) => roleOf.get(id)!.has(p)) && (load.get(id) ?? 0) < MAX_LOAD);
      pool.sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0)
        || Math.min(...prefs.map((p, i) => (roleOf.get(a)!.has(p) ? i : 99))) - Math.min(...prefs.map((p, i) => (roleOf.get(b)!.has(p) ? i : 99)))
        || a.localeCompare(b));
      const who = pool[0] ?? null;
      out.push({ ...s, staff_id: who, regular: s.regulars[0] ?? null, source: who ? 'Cover' : 'Open' });
      if (who) bump(who);
    }

    return this.dbs.run(user, async (tx) => {
      await tx.execute(sql`delete from hostel.daily_duty where duty_date = ${date}::date and facility_id = ${facilityId} and source <> 'Manual'`);
      if (out.length) {
        await tx.execute(sql`insert into hostel.daily_duty (duty_date, facility_id, zone_id, space_id, hostel_role, shift, staff_id, regular_staff_id, source, created_by)
          select ${date}::date, ${facilityId}, x.zone_id, x.space_id, x.hostel_role, x.shift::hostel.shift, x.staff_id, x.regular, x.source::hostel.duty_source, ${user.id}
          from jsonb_to_recordset(${JSON.stringify(out.map(({ regulars: _r, ...o }) => o))}::jsonb) as x(zone_id text, space_id text, hostel_role text, shift text, staff_id text, regular text, source text)`);
      }
      return { places: out.length + manual.length, regular: out.filter((o) => o.source === 'Regular').length, cover: out.filter((o) => o.source === 'Cover').length, open: out.filter((o) => o.source === 'Open').length, kept: manual.length };
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
