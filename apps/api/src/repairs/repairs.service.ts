import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

type Tx = Parameters<Parameters<DbService['run']>[1]>[0];
export const WARDENS = ['Floor_Warden', 'Warden', 'Assistant_Warden', 'Hostel_Incharge', 'Chief_Warden', 'Director_Hostels'];
export const MESS = ['Mess_Incharge', 'Mess_Manager', 'Mess_Supervisor'];
export const MAINT = ['Maintenance_Supervisor', 'Technician', 'Electrician'];
const OPEN = sql`t.status in ('Open', 'Assigned', 'In_Progress', 'Reopened')`;

const COLS = sql`t.ticket_id::int as ticket_id, t.area, t.item_code, ti.label as item_label, t.category_id, c.category_name, t.description, t.location_note, t.priority::text as priority,
  t.status::text as status, t.facility_id, hp.hostel_code, t.space_id, s.space_code, t.raised_by, t.raiser_type::text as raiser_type,
  coalesce(initcap(rst.full_name), initcap(rs.full_name)) as raised_by_name, t.raised_date, t.deadline_at, t.l1_decision, t.l1_remarks, t.l1_at,
  initcap(l1.full_name) as l1_by_name, t.escalated_at, t.closure_due_at, t.assigned_to, initcap(asg.full_name) as assigned_name, t.resolved_date, t.closure_report,
  t.resolution_notes, t.student_confirmed, t.verified_at, t.work_not_done,
  (t.closure_due_at < now() and ${OPEN}) or (t.closure_due_at is null and t.deadline_at < now() and ${OPEN}) as late`;
const FROM = sql`infra.maintenance_ticket t join infra.maintenance_category c on c.category_id = t.category_id
  left join hostel.ticket_item ti on ti.item_code = t.item_code left join hostel.hostel_profile hp on hp.facility_id = t.facility_id
  left join infra.space s on s.space_id = t.space_id left join ref.student_master rst on rst.student_id = t.raised_by
  left join ref.staff_master rs on rs.staff_id = t.raised_by left join ref.staff_master l1 on l1.staff_id = t.l1_by
  left join infra.technician tc on tc.technician_id = t.assigned_to left join ref.staff_master asg on asg.staff_id = coalesce(tc.staff_id, t.supervisor_id)`;

/**
 * TKT-01 My tickets and TKT-03 Repair desk (Workflow H). A student reports something wrong in their room, the mess or a
 * common facility; the warden (the mess in-charge for the mess) checks it is genuine; maintenance (the mess for the
 * mess) repairs it and files a closure report within the time the trade allows; the student confirms or reopens it.
 */
@Injectable()
export class RepairsService {
  constructor(private dbs: DbService) {}

  items() {
    return this.dbs.rows(sql`select i.item_code, i.area, i.category_id, c.category_name, i.label, i.hint, i.priority::text as priority, c.default_sla_hours::int as sla_hours
      from hostel.ticket_item i join infra.maintenance_category c on c.category_id = i.category_id where i.active order by i.area, i.sort_no`);
  }

  private async event(tx: Tx, user: AuthUser, id: number, action: string, note?: string | null) {
    await tx.execute(sql`insert into hostel.ticket_event (ticket_id, event_no, action, actor_id, role_code, event_at, note, created_by)
      values (${id}, (select coalesce(max(event_no), 0) + 1 from hostel.ticket_event where ticket_id = ${id}), ${action},
              ${user.kind === 'staff' ? user.id : null}, ${user.role}, now(), ${note ?? null}, ${user.id})`);
  }

  private async withEvents(rows: Record<string, unknown>[]) {
    if (!rows.length) return rows;
    const ids = rows.map((r) => r.ticket_id).join(',');
    const ev = await this.dbs.rows<{ ticket_id: number; action: string; event_at: string; note: string | null; by: string | null }>(sql`
      select e.ticket_id::int as ticket_id, e.action, e.event_at, e.note, coalesce(initcap(sm.full_name), case when e.role_code = 'Student' then 'Student' end) as by
      from hostel.ticket_event e left join ref.staff_master sm on sm.staff_id = e.actor_id
      where e.ticket_id = any(string_to_array(${ids}, ',')::bigint[]) order by e.ticket_id, e.event_no`);
    return rows.map((r) => ({ ...r, events: ev.filter((e) => e.ticket_id === r.ticket_id) }));
  }

  /* ---------------------------------------------------------------- student */

  async mine(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const [stay] = await this.dbs.rows<{ facility_id: string; space_id: string; bed_label: string; hostel_code: string; mess_name: string | null }>(sql`
      select b.facility_id, b.space_id, b.bed_label, b.hostel_code, (select m.mess_name from hostel.v_mess_resident r join hostel.mess_master m using (mess_id) where r.student_id = ${user.id}) as mess_name
      from hostel.v_bed b where b.student_id = ${user.id} and b.occupant_type = 'Student' limit 1`);
    const rows = await this.dbs.rows(sql`select ${COLS} from ${FROM} where t.raised_by = ${user.id} order by ${OPEN} desc, t.raised_date desc limit 50`);
    return { stay: stay ?? null, items: await this.items(), tickets: await this.withEvents(rows) };
  }

  async raise(user: AuthUser, dto: { item_code: string; description: string; location_note?: string | null }) {
    const m = await this.mine(user);
    if (!m.stay) throw new UnprocessableEntityException('You can raise a ticket once you live in a hostel');
    const [it] = await this.dbs.rows<{ area: string; category_id: string; priority: string; sla: number; label: string; doc_item: string }>(sql`
      select i.area, i.category_id, i.priority::text as priority, c.default_sla_hours::int as sla, i.label, i.doc_item from hostel.ticket_item i
      join infra.maintenance_category c using (category_id) where i.item_code = ${dto.item_code} and i.active`);
    if (!it) throw new NotFoundException('Choose what is wrong from the list');
    if (it.area === 'Common' && !dto.location_note?.trim()) throw new UnprocessableEntityException('Say where it is: floor, wing or room name');
    // the same thing already reported and still open: the student is told instead of opening a second ticket
    const [dup] = await this.dbs.rows<{ ticket_id: number }>(sql`select ticket_id::int as ticket_id from infra.maintenance_ticket t where t.item_code = ${dto.item_code} and ${OPEN}
      and t.facility_id = ${m.stay.facility_id} and (${it.area} <> 'Room' or t.space_id = ${m.stay.space_id}) and t.raised_date > now() - interval '3 days'
      and (${it.area} = 'Room' or coalesce(t.location_note, '') ilike ${`%${(dto.location_note ?? '').trim().slice(0, 12)}%`})`);
    if (dup) throw new UnprocessableEntityException(`This is already reported as ticket ${dup.ticket_id} and is being looked at`);
    return this.dbs.run(user, async (tx) => {
      const [t] = (await tx.execute(sql`insert into infra.maintenance_ticket (raised_by, raiser_type, facility_id, space_id, category_id, description, priority, deadline_at,
          source, area, item, item_code, location_note, ticket_group)
        values (${user.id}, 'Student', ${m.stay!.facility_id}, ${it.area === 'Room' ? m.stay!.space_id : null}, ${it.category_id}, ${dto.description.trim()}, ${it.priority}::infra.priority,
          now() + make_interval(hours => ${it.sla}), 'Student_QR', ${it.area}, ${it.doc_item}, ${dto.item_code}, ${dto.location_note?.trim() || null},
          ${it.category_id === 'ELEC' ? 'Electrical' : it.category_id === 'CARP' ? 'Furniture_Doors' : it.category_id === 'PLUMB' ? 'Plumbing' : 'Other'})
        returning ticket_id::int as ticket_id`)) as unknown as { ticket_id: number }[];
      await this.event(tx, user, t.ticket_id, 'Raised', `${it.label}${dto.location_note ? ` · ${dto.location_note}` : ''}`);
      // tell whoever checks it: the floor manager of the student's floor (room and common), the mess in-charge (mess)
      await tx.execute(sql`insert into shared.notification (recipient_type, staff_id, channel, template_code, subject, body, related_type, related_id)
        select 'Staff', a.staff_id, 'In_App', 'TICKET_RAISED', ${`New ticket: ${it.label}`}, ${`${m.stay!.bed_label}: ${dto.description.trim().slice(0, 140)}`}, 'maintenance_ticket', ${String(t.ticket_id)}
        from hostel.staff_space_assignment a
        where a.status = 'Active' and a.facility_id = ${m.stay!.facility_id}
          and (case when ${it.area} = 'Mess' then a.hostel_role in ('Mess_Incharge', 'Mess_Supervisor')
                    else a.hostel_role = 'Floor_Warden' and (a.zone_id is null or a.zone_id = (select zone_id from infra.space where space_id = ${m.stay!.space_id})) end)`);
      return t;
    });
  }

  async confirm(user: AuthUser, id: number, dto: { fixed: boolean; note?: string | null }) {
    const [t] = await this.dbs.rows<{ status: string; raised_by: string }>(sql`select status::text as status, raised_by from infra.maintenance_ticket where ticket_id = ${id}`);
    if (!t || t.raised_by !== user.id) throw new NotFoundException('Ticket not found');
    if (t.status !== 'Resolved') throw new UnprocessableEntityException('You can confirm once the repair is reported done');
    return this.dbs.run(user, async (tx) => {
      await tx.execute(sql`update infra.maintenance_ticket set status = ${dto.fixed ? 'Closed' : 'Reopened'}::infra.ticket_status, student_confirmed = ${dto.fixed},
        work_not_done = ${!dto.fixed}, verified_at = case when ${dto.fixed} then now() else verified_at end,
        closure_due_at = case when ${dto.fixed} then closure_due_at else now() + interval '24 hours' end where ticket_id = ${id}`);
      await this.event(tx, user, id, 'Confirmed', dto.fixed ? `Fixed${dto.note ? `: ${dto.note}` : ''}` : `Not fixed${dto.note ? `: ${dto.note}` : ''}`);
      return { ok: true };
    });
  }

  /* ---------------------------------------------------------------- repair desk */

  /** What this person works on: wardens their hostels' room and common tickets, the mess its tickets, maintenance the verified jobs. */
  private deskWhere(user: AuthUser): SQL {
    const r = user.roles;
    const parts: SQL[] = [];
    if (r.some((x) => WARDENS.includes(x)) || r.includes('admin')) parts.push(sql`(t.area is distinct from 'Mess' and ${facWhere('t.facility_id', undefined, user)})`);
    if (r.some((x) => MESS.includes(x))) parts.push(sql`t.area = 'Mess'`);
    if (r.some((x) => MAINT.includes(x))) parts.push(sql`(t.area is distinct from 'Mess' and (t.l1_decision = 'Genuine' or t.raiser_type <> 'Student'))`);
    return parts.length ? sql`(${sql.join(parts, sql` or `)})` : sql`false`;
  }

  async desk(user: AuthUser, show: 'open' | 'all' = 'open') {
    const rows = await this.dbs.rows(sql`select ${COLS} from ${FROM} where ${this.deskWhere(user)}
      and (${show === 'all'} or ${OPEN} or t.status = 'Resolved' or t.raised_date > now() - interval '3 days')
      order by (t.status in ('Open') and t.l1_decision is null and t.raiser_type = 'Student') desc, t.priority desc, t.raised_date desc limit 200`);
    // only students' tickets are checked; a ticket from a floor round or inspection is already the inspector's finding
    const [counts] = await this.dbs.rows(sql`select count(*) filter (where t.status = 'Open' and t.l1_decision is null and t.raiser_type = 'Student')::int as to_verify,
        count(*) filter (where ${OPEN} and t.l1_decision = 'Genuine' or (${OPEN} and t.raiser_type <> 'Student'))::int as to_repair,
        count(*) filter (where t.status = 'Resolved')::int as awaiting_student,
        count(*) filter (where (t.closure_due_at < now() or (t.closure_due_at is null and t.deadline_at < now())) and ${OPEN})::int as late
      from infra.maintenance_ticket t where ${this.deskWhere(user)}`);
    return { counts, tickets: await this.withEvents(rows) };
  }

  private async ticket(user: AuthUser, id: number) {
    const [t] = await this.dbs.rows<{ status: string; area: string | null; l1_decision: string | null; category_id: string; raiser_type: string; raised_by: string }>(sql`
      select t.status::text as status, t.area, t.l1_decision, t.category_id, t.raiser_type::text as raiser_type, t.raised_by from infra.maintenance_ticket t where t.ticket_id = ${id} and ${this.deskWhere(user)}`);
    if (!t) throw new NotFoundException('Ticket not found on your desk');
    return t;
  }

  /** Level 1: is the complaint genuine? A genuine one goes to the repairers with its time to fix. */
  async verify(user: AuthUser, id: number, dto: { genuine: boolean; remarks?: string | null }) {
    const t = await this.ticket(user, id);
    const may = t.area === 'Mess' ? user.roles.some((r) => MESS.includes(r)) : user.roles.some((r) => WARDENS.includes(r));
    if (!may) throw new ForbiddenException(t.area === 'Mess' ? 'The mess in-charge checks mess tickets' : 'A warden checks this ticket');
    if (t.status !== 'Open' || t.l1_decision) throw new UnprocessableEntityException('This ticket has already been checked');
    if (t.raiser_type !== 'Student') throw new UnprocessableEntityException('A ticket from a floor round or inspection goes straight to repair');
    if (t.raised_by === user.id) throw new ForbiddenException('Nobody checks a ticket they raised');
    return this.dbs.run(user, async (tx) => {
      await tx.execute(sql`update infra.maintenance_ticket set l1_decision = ${dto.genuine ? 'Genuine' : 'Not_Genuine'}, l1_by = ${user.id}, l1_at = now(), l1_remarks = ${dto.remarks ?? null},
          status = ${dto.genuine ? 'Assigned' : 'Closed'}::infra.ticket_status, escalated_at = case when ${dto.genuine} then now() end,
          closure_due_at = case when ${dto.genuine} then now() + make_interval(hours => (select default_sla_hours from infra.maintenance_category where category_id = ${t.category_id})) end
        where ticket_id = ${id}`);
      await this.event(tx, user, id, dto.genuine ? 'Verified' : 'Rejected', dto.remarks);
      if (dto.genuine) await this.event(tx, user, id, 'Escalated', t.area === 'Mess' ? 'To the mess' : 'To maintenance');
      return { ok: true };
    });
  }

  async start(user: AuthUser, id: number) {
    const t = await this.ticket(user, id);
    const ready = ['Assigned', 'Reopened'].includes(t.status) || (t.status === 'Open' && t.raiser_type !== 'Student');
    if (!ready) throw new UnprocessableEntityException('Only a verified ticket can be started');
    return this.dbs.run(user, async (tx) => {
      // the person taking the job; assigned_to names a technician from infra.technician when they are one
      await tx.execute(sql`update infra.maintenance_ticket set status = 'In_Progress', supervisor_id = coalesce(supervisor_id, ${user.id}),
          assigned_to = coalesce(assigned_to, (select technician_id from infra.technician where staff_id = ${user.id} limit 1)), assigned_date = coalesce(assigned_date, now())
        where ticket_id = ${id}`);
      await this.event(tx, user, id, 'Started');
      return { ok: true };
    });
  }

  /** The repair is done: closure report; the student is asked to confirm. */
  async resolve(user: AuthUser, id: number, dto: { report: string; cost?: number | null }) {
    const t = await this.ticket(user, id);
    const may = t.area === 'Mess' ? user.roles.some((r) => MESS.includes(r)) : user.roles.some((r) => MAINT.includes(r) || r === 'Chief_Warden');
    if (!may) throw new ForbiddenException('Maintenance files the closure report');
    if (!(['Assigned', 'In_Progress', 'Reopened'].includes(t.status) || (t.status === 'Open' && t.raiser_type !== 'Student'))) throw new UnprocessableEntityException('Only a ticket being repaired can be closed');
    return this.dbs.run(user, async (tx) => {
      await tx.execute(sql`update infra.maintenance_ticket set status = 'Resolved', resolved_date = now(), closure_report = ${dto.report}, resolution_notes = ${dto.report},
          closure_by = ${user.id}, closure_at = now(), cost_incurred = ${dto.cost ?? null}, supervisor_id = coalesce(supervisor_id, ${user.id}) where ticket_id = ${id}`);
      await this.event(tx, user, id, 'Closure_Report', dto.report);
      await tx.execute(sql`insert into shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
        select 'Student', t.raised_by, 'In_App', 'TICKET_RESOLVED', 'Your repair is done', ${`Ticket ${id}: ${dto.report.slice(0, 140)}. Please confirm it is fixed.`}, 'maintenance_ticket', ${String(id)}
        from infra.maintenance_ticket t where t.ticket_id = ${id} and t.raiser_type = 'Student'`);
      return { ok: true };
    });
  }

  /** For EXE-01: tickets by building, last 30 days and open now. */
  summary(facilityId?: string) {
    return this.dbs.rows(sql`select t.facility_id, count(*) filter (where ${OPEN})::int as open, count(*) filter (where t.status = 'Resolved')::int as awaiting_student,
        count(*) filter (where ${OPEN} and (t.closure_due_at < now() or (t.closure_due_at is null and t.deadline_at < now())))::int as late,
        count(*) filter (where t.raised_date > now() - interval '30 days')::int as raised_30d,
        count(*) filter (where t.status = 'Closed' and t.raised_date > now() - interval '30 days')::int as closed_30d,
        round(avg(extract(epoch from (t.resolved_date - t.raised_date)) / 3600) filter (where t.resolved_date is not null and t.raised_date > now() - interval '30 days'), 1)::float as avg_hours,
        count(*) filter (where ${OPEN} and t.area = 'Room')::int as open_room, count(*) filter (where ${OPEN} and t.area = 'Mess')::int as open_mess,
        count(*) filter (where ${OPEN} and t.area = 'Common')::int as open_common
      from infra.maintenance_ticket t where ${facilityId ? sql`t.facility_id = ${facilityId}` : sql`true`} group by t.facility_id`);
  }
}
