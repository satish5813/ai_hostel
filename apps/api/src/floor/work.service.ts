import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

type Mark = { student_id: string; status: 'Present' | 'Absent' | 'On_Pass' | 'Sick_Leave'; remarks?: string };
const myZones = (user: AuthUser) => sql`(select z.zone_id from infra.zone z where exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id}
  and a.status = 'Active' and a.facility_id = z.facility_id and (a.zone_id is null or a.zone_id = z.zone_id)
  and a.hostel_role in ('Floor_Warden','Warden','Assistant_Warden','Chief_Warden','Hostel_Incharge')))`;

/**
 * The Floor Manager's work besides approvals: attendance in sessions through the day, floor rounds with a checklist
 * that raise maintenance tickets for what is broken, and closing those tickets once the repair is confirmed.
 */
@Injectable()
export class WorkService {
  constructor(private dbs: DbService) {}

  /** Sessions of the day for the hostels in the caller's charge, with how many of their residents are marked. */
  sessions(user: AuthUser, date: string) {
    return this.dbs.rows(sql`
      select s.session_id::int as session_id, s.session_name, to_char(s.starts_at, 'HH24:MI') as starts_at, to_char(s.ends_at, 'HH24:MI') as ends_at, s.method::text as method,
        s.is_night, s.raises_alert, extract(isodow from ${date}::date)::int = any(s.days) as today,
        (select count(*)::int from hostel.session_attendance m join hostel.v_bed b on b.student_id = m.student_id
           where m.session_id = s.session_id and m.att_date = ${date}::date and b.zone_id in ${myZones(user)}) as marked
      from hostel.attendance_session s where s.status = 'Active' order by s.starts_at`);
  }

  sessionMarks(user: AuthUser, sessionId: number, date: string) {
    return this.dbs.rows(sql`select m.student_id, m.status::text as status, m.method::text as method, to_char(m.marked_at, 'HH24:MI') as at
      from hostel.session_attendance m join hostel.v_bed b on b.student_id = m.student_id where m.session_id = ${sessionId} and m.att_date = ${date}::date and b.zone_id in ${myZones(user)}`);
  }

  /** Save a session. The night session also writes the night register and raises Not Seen alerts, as before. */
  async markSession(user: AuthUser, dto: { session_id: number; att_date: string; facility_id: string; marks: Mark[] }) {
    const [s] = await this.dbs.rows<{ is_night: boolean; raises_alert: boolean }>(sql`select is_night, raises_alert from hostel.attendance_session where session_id = ${dto.session_id}`);
    if (!s) throw new NotFoundException('No such session');
    await this.dbs.run(user, async (tx) => {
      const x = sql`jsonb_to_recordset(${JSON.stringify(dto.marks)}::jsonb) as x(student_id text, status text, remarks text)`;
      await tx.execute(sql`insert into hostel.session_attendance (session_id, att_date, student_id, status, method, remarks, marked_by)
        select ${dto.session_id}, ${dto.att_date}::date, x.student_id, x.status::hostel.attendance_status, 'Manual', x.remarks, ${user.id} from ${x}
        on conflict (session_id, att_date, student_id) do update set status = excluded.status, remarks = excluded.remarks, marked_by = excluded.marked_by, marked_at = now()`);
      if (s.is_night) {
        await tx.execute(sql`insert into hostel.night_attendance (student_id, att_date, status, facility_id, remarks, marked_by)
          select x.student_id, ${dto.att_date}::date, x.status::hostel.attendance_status, ${dto.facility_id}, x.remarks, ${user.id} from ${x}
          on conflict (student_id, att_date) do update set status = excluded.status, remarks = excluded.remarks, marked_by = excluded.marked_by, marked_at = now()`);
      }
      if (s.raises_alert) {
        await tx.execute(sql`insert into hostel.hostel_alert (alert_type, student_id, facility_id, related_type, severity, assigned_to, created_by)
          select 'Not_Seen', x.student_id, ${dto.facility_id}, 'session_attendance', 'Warning',
            (select a.staff_id from hostel.staff_space_assignment a join hostel.v_bed b on b.student_id = x.student_id
              where a.facility_id = b.facility_id and a.hostel_role = 'Floor_Warden' and a.status = 'Active' and (a.zone_id is null or a.zone_id = b.zone_id) limit 1), ${user.id}
          from ${x} where x.status = 'Absent'
            and not exists (select 1 from hostel.hostel_alert h where h.student_id = x.student_id and h.alert_type = 'Not_Seen' and h.status <> 'Closed' and h.raised_at::date = ${dto.att_date}::date)`);
      }
    });
    return { saved: dto.marks.length };
  }

  /** Today's round: every room, washroom and the floor itself with the checklist items, what was found, and open tickets. */
  async round(user: AuthUser, date: string) {
    const places = await this.dbs.rows(sql`
      select s.space_id as place, s.space_id, s.space_code, s.space_category::text as category, s.zone_id, z.zone_name, z.sequence_no::int as floor_no, z.facility_id
      from infra.space s join infra.zone z on z.zone_id = s.zone_id
      where s.zone_id in ${myZones(user)} and s.space_category in ('Hostel_Room','Toilet_Block','Common_Area') and s.status <> 'Decommissioned'
      union all
      select z.zone_id, null, 'Floor', 'Floor', z.zone_id, z.zone_name, z.sequence_no::int, z.facility_id from infra.zone z where z.zone_id in ${myZones(user)}
        and exists (select 1 from infra.space s where s.zone_id = z.zone_id and s.space_category = 'Hostel_Room')
      order by 7, 4 desc, 3`);
    const items = await this.dbs.rows(sql`select item_code, item_name, applies_to, category_id from hostel.round_item order by applies_to, sort_no`);
    const lines = await this.dbs.rows(sql`select l.place, l.item_code, l.ok, l.note, l.ticket_id::int as ticket_id from hostel.floor_round r join hostel.floor_round_line l on l.round_id = r.round_id
      where r.round_date = ${date}::date and r.done_by = ${user.id}`);
    const tickets = await this.tickets(user);
    return { date, places, items, lines, tickets };
  }

  /** Save what was checked on one floor. Each failed item without an open ticket for that place and trade raises one. */
  async saveRound(user: AuthUser, dto: { zone_id: string; date: string; lines: { place: string; space_id?: string | null; item_code: string; ok: boolean; note?: string }[] }) {
    const [z] = await this.dbs.rows<{ facility_id: string }>(sql`select z.facility_id from infra.zone z where z.zone_id = ${dto.zone_id} and z.zone_id in ${myZones(user)}`);
    if (!z) throw new ForbiddenException('This floor is not in your charge');
    if (dto.lines.some((l) => !l.ok && !l.note?.trim())) throw new UnprocessableEntityException('Say what is wrong for every item marked as a fault');
    return this.dbs.run(user, async (tx) => {
      const [r] = (await tx.execute(sql`insert into hostel.floor_round (facility_id, zone_id, round_date, done_by) values (${z.facility_id}, ${dto.zone_id}, ${dto.date}::date, ${user.id})
        on conflict (zone_id, round_date, done_by) do update set submitted_at = now() returning round_id::int as round_id`)) as unknown as { round_id: number }[];
      let raised = 0;
      for (const l of dto.lines) {
        let ticket: number | null = null;
        if (!l.ok) {
          const [open] = (await tx.execute(sql`select t.ticket_id::int as ticket_id from infra.maintenance_ticket t join hostel.round_item i on i.item_code = ${l.item_code}
            where t.category_id = i.category_id and t.status in ('Open','Assigned','In_Progress','Reopened') and coalesce(t.space_id, '') = coalesce(${l.space_id ?? null}, '') and t.facility_id = ${z.facility_id} limit 1`)) as unknown as { ticket_id: number }[];
          if (open) ticket = open.ticket_id;
          else {
            const [t] = (await tx.execute(sql`insert into infra.maintenance_ticket (raised_by, raiser_type, facility_id, space_id, category_id, description, priority, deadline_at)
              select ${user.id}, 'Inspection', ${z.facility_id}, ${l.space_id ?? null}, i.category_id, i.item_name || ': ' || ${l.note ?? ''},
                (case when i.category_id in ('FIRE') then 'Critical' when i.category_id in ('PLUMB','ELEC') then 'High' else 'Medium' end)::infra.priority,
                now() + make_interval(hours => c.default_sla_hours)
              from hostel.round_item i join infra.maintenance_category c on c.category_id = i.category_id where i.item_code = ${l.item_code}
              returning ticket_id::int as ticket_id`)) as unknown as { ticket_id: number }[];
            ticket = t.ticket_id; raised++;
          }
        }
        await tx.execute(sql`insert into hostel.floor_round_line (round_id, place, space_id, item_code, ok, note, ticket_id) values (${r.round_id}, ${l.place}, ${l.space_id ?? null}, ${l.item_code}, ${l.ok}, ${l.note ?? null}, ${ticket})
          on conflict (round_id, place, item_code) do update set ok = excluded.ok, note = excluded.note, ticket_id = coalesce(excluded.ticket_id, hostel.floor_round_line.ticket_id)`);
      }
      await tx.execute(sql`update hostel.floor_round set submitted_at = now(), places_checked = (select count(distinct place) from hostel.floor_round_line where round_id = ${r.round_id}),
        faults = (select count(*) from hostel.floor_round_line where round_id = ${r.round_id} and not ok) where round_id = ${r.round_id}`);
      return { round_id: r.round_id, raised };
    });
  }

  tickets(user: AuthUser) {
    return this.dbs.rows(sql`
      select t.ticket_id::int as ticket_id, t.description, t.priority::text as priority, t.status::text as status, t.raised_date, t.deadline_at, t.resolved_date, t.resolution_notes,
        t.category_id, c.category_name, s.space_code, s.space_category::text as space_category, z.zone_name, t.raised_by, coalesce(rs.full_name, rst.full_name) as raised_by_name,
        t.verified_by, t.verified_at, (t.deadline_at < now() and t.status not in ('Resolved','Closed')) as late
      from infra.maintenance_ticket t join infra.maintenance_category c on c.category_id = t.category_id
      left join infra.space s on s.space_id = t.space_id left join infra.zone z on z.zone_id = s.zone_id
      left join ref.staff_master rs on rs.staff_id = t.raised_by left join ref.student_master rst on rst.student_id = t.raised_by
      where (s.zone_id in ${myZones(user)} or (t.space_id is null and t.raised_by = ${user.id}))
        and (t.status <> 'Closed' or t.verified_at > now() - interval '7 days')
      order by (t.status = 'Resolved') desc, t.priority desc, t.raised_date`);
  }

  async raise(user: AuthUser, dto: { space_id: string; category_id: string; description: string; priority?: string }) {
    const [sp] = await this.dbs.rows<{ facility_id: string }>(sql`select z.facility_id from infra.space s join infra.zone z on z.zone_id = s.zone_id where s.space_id = ${dto.space_id} and s.zone_id in ${myZones(user)}`);
    if (!sp) throw new ForbiddenException('This place is not in your charge');
    return this.dbs.run(user, async (tx) => {
      const [t] = (await tx.execute(sql`insert into infra.maintenance_ticket (raised_by, raiser_type, facility_id, space_id, category_id, description, priority, deadline_at)
        select ${user.id}, 'Staff', ${sp.facility_id}, ${dto.space_id}, c.category_id, ${dto.description}, ${dto.priority ?? 'Medium'}::infra.priority, now() + make_interval(hours => c.default_sla_hours)
        from infra.maintenance_category c where c.category_id = ${dto.category_id} returning ticket_id::int as ticket_id`)) as unknown as { ticket_id: number }[];
      if (!t) throw new UnprocessableEntityException('Unknown trade');
      return t;
    });
  }

  /** TKT-02: the Floor Manager confirms the repair (Closed) or sends it back (Reopened). Not on a ticket they raised and repaired themselves. */
  async confirm(user: AuthUser, id: number, dto: { fixed: boolean; note?: string }) {
    const [t] = await this.dbs.rows<{ status: string }>(sql`select status::text as status from infra.maintenance_ticket where ticket_id = ${id}`);
    if (!t) throw new NotFoundException('Ticket not found');
    if (t.status !== 'Resolved') throw new UnprocessableEntityException('Only a ticket marked repaired can be confirmed');
    if (!dto.fixed && !dto.note) throw new UnprocessableEntityException('Say what is still wrong');
    return this.dbs.run(user, (tx) => tx.execute(sql`update infra.maintenance_ticket set status = ${dto.fixed ? 'Closed' : 'Reopened'}::infra.ticket_status, verified_by = ${user.id}, verified_at = now(),
      closure_report = coalesce(${dto.note ?? null}, closure_report) where ticket_id = ${id}`)).then(() => ({ ticket_id: id }));
  }

  /** TKT-03 (minimal): the maintenance side marks the repair done, with what was done. */
  resolve(user: AuthUser, id: number, note: string) {
    return this.dbs.run(user, (tx) => tx.execute(sql`update infra.maintenance_ticket set status = 'Resolved', resolved_date = now(), resolution_notes = ${note}
      where ticket_id = ${id} and status in ('Open','Assigned','In_Progress','Reopened') returning ticket_id`)).then((r) => { if (!(r as unknown as unknown[]).length) throw new NotFoundException('No open ticket with this number'); return { ticket_id: id }; });
  }

  categories() { return this.dbs.rows(sql`select category_id, category_name, default_sla_hours from infra.maintenance_category order by category_name`); }
}
