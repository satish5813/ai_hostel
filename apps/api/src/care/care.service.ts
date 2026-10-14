import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Who reviews checklists whatever the template says: the Chief Manager and Director for hostel checklists. */
const HOSTEL_HEADS = ['Chief_Warden', 'Director_Hostels', 'admin'];
/** Grievances that are not repairs: who works on them; confidential ones only reach the heads and the Dean. */
export const GRIEVANCE_STAFF = ['Warden', 'Floor_Warden', 'Chief_Warden', 'Director_Hostels', 'Room_Allotment', 'Office_Staff', 'Dean_Students_Affairs', 'admin'];
const CONFIDENTIAL_OK = ['Chief_Warden', 'Director_Hostels', 'Dean_Students_Affairs', 'admin'];
type Answer = { item_no: number; answer: string; remarks?: string | null; space_id?: string | null };

/**
 * TKT-05 checklists (filled by the role on the template, signed by its reviewer; a failed item with a trade opens a
 * repair ticket) and TKT-06 grievances that are not repairs (room-mate, staff conduct, ragging, safety ...).
 */
@Injectable()
export class CareService {
  constructor(private dbs: DbService) {}
  private run<T>(user: AuthUser, q: SQL) { return this.dbs.run(user, (tx) => tx.execute(q)) as unknown as Promise<T[]>; }
  private roles(user: AuthUser) { return sql`string_to_array(${user.roles.join(',')}, ',')`; }

  /* ------------------------------------------------------------ checklists */

  /** Templates this person fills, submissions waiting for this person's signature, and recent ones. */
  async checklists(user: AuthUser) {
    const fill = await this.dbs.rows(sql`select t.template_id::int as template_id, t.template_name, t.frequency, t.scope, t.answer_type, t.reviewer_role,
        (select count(*)::int from hostel.checklist_item i where i.template_id = t.template_id) as items,
        (select max(s.period_date) from hostel.checklist_submission s where s.template_id = t.template_id and s.submitted_by = ${user.id}) as last_done
      from hostel.checklist_template t where t.status = 'Active' and (t.role_code = any(${this.roles(user)}) or 'admin' = any(${this.roles(user)})) order by t.template_name`);
    const list = await this.dbs.rows(sql`select s.submission_id::int as submission_id, t.template_name, t.scope, s.facility_id, fc.facility_name as hostel_name, z.zone_name, s.period_date, s.shift,
        s.overall_status, s.status, s.submitted_at, initcap(sb.full_name) as submitted_by_name, initcap(rv.full_name) as reviewed_by_name, s.reviewed_at, s.review_remarks,
        (select count(*)::int from hostel.checklist_response r where r.submission_id = s.submission_id and r.answer in ('No', 'Not_OK', 'Red')) as fails,
        (select count(*)::int from hostel.checklist_response r where r.submission_id = s.submission_id and r.ticket_id is not null) as tickets,
        (t.reviewer_role = any(${this.roles(user)}) or (t.scope in ('Hostel', 'Floor', 'Room') and ${user.roles.some((r) => HOSTEL_HEADS.includes(r))})) as can_review
      from hostel.checklist_submission s join hostel.checklist_template t using (template_id) left join infra.facility fc on fc.facility_id = s.facility_id
      left join infra.zone z on z.zone_id = s.zone_id left join ref.staff_master sb on sb.staff_id = s.submitted_by left join ref.staff_master rv on rv.staff_id = s.reviewed_by
      where (s.submitted_by = ${user.id} or t.reviewer_role = any(${this.roles(user)})
             or (t.scope in ('Hostel', 'Floor', 'Room') and ${user.roles.some((r) => HOSTEL_HEADS.includes(r))} and ${facWhere('s.facility_id', null, user)}))
      order by (s.status = 'Submitted') desc, s.period_date desc, s.submission_id desc limit 200`);
    return { fill, submissions: list };
  }

  /** The form: items, and where it can be done (the person's floors for a floor checklist, messes for a mess one). */
  async template(user: AuthUser, id: number) {
    const [t] = await this.dbs.rows<{ scope: string }>(sql`select template_id::int as template_id, template_name, frequency, scope, answer_type, reviewer_role from hostel.checklist_template where template_id = ${id}`);
    if (!t) throw new NotFoundException('Checklist not found');
    const items = await this.dbs.rows(sql`select item_no::int as item_no, section, item_text, category_id, ticket_on_fail from hostel.checklist_item where template_id = ${id} order by item_no`);
    const places = t.scope === 'Mess' || t.scope === 'Store'
      ? await this.dbs.rows(sql`select m.facility_id, null::text as zone_id, m.mess_name as label from hostel.mess_master m where m.facility_id is not null order by m.mess_name`)
      : await this.dbs.rows(sql`select a.facility_id, a.zone_id, fc.facility_name || coalesce(' · ' || z.zone_name, '') as label
          from hostel.staff_space_assignment a join infra.facility fc on fc.facility_id = a.facility_id left join infra.zone z on z.zone_id = a.zone_id
          where a.staff_id = ${user.id} and a.status = 'Active' order by label`);
    return { ...t, items, places };
  }

  async submit(user: AuthUser, dto: { template_id: number; facility_id: string; zone_id?: string | null; period_date: string; shift?: string | null; answers: Answer[] }) {
    const t = (await this.template(user, dto.template_id)) as unknown as { items: { item_no: number; item_text: string; category_id: string | null; ticket_on_fail: boolean }[]; template_name: string };
    const fail = (a: string) => ['No', 'Not_OK', 'Red'].includes(a);
    if (dto.answers.length !== t.items.length) throw new UnprocessableEntityException('Answer every item');
    const failed = dto.answers.filter((a) => fail(a.answer));
    const missing = failed.find((a) => !(a.remarks ?? '').trim());
    if (missing) throw new UnprocessableEntityException(`Item ${missing.item_no}: say what is wrong`);
    const fire = failed.some((a) => t.items.find((i) => i.item_no === a.item_no)?.category_id === 'FIRE');
    const overall = fire || failed.length >= 5 ? 'Urgent_Action' : failed.length >= 3 ? 'Needs_Attention' : failed.length ? 'Minor_Corrections' : 'Satisfactory';
    return this.dbs.run(user, async (tx) => {
      const [s] = (await tx.execute(sql`insert into hostel.checklist_submission (template_id, facility_id, zone_id, period_date, shift, submitted_by, overall_status, created_by)
        values (${dto.template_id}, ${dto.facility_id}, ${dto.zone_id ?? null}, ${dto.period_date}::date, ${dto.shift ?? null}, ${user.id}, ${overall}, ${user.id})
        returning submission_id::int as submission_id`)) as unknown as { submission_id: number }[];
      let tickets = 0;
      for (const a of dto.answers) {
        const item = t.items.find((i) => i.item_no === a.item_no);
        if (!item) throw new UnprocessableEntityException(`Item ${a.item_no} is not on this checklist`);
        let ticket: number | null = null;
        if (fail(a.answer) && item.ticket_on_fail && item.category_id) {
          const [tk] = (await tx.execute(sql`insert into infra.maintenance_ticket (raised_by, raiser_type, facility_id, space_id, category_id, description, priority, deadline_at)
            select ${user.id}, 'Inspection', ${dto.facility_id}, ${a.space_id ?? null}, c.category_id, ${`${t.template_name}: ${item.item_text}. ${a.remarks ?? ''}`.slice(0, 600)},
              (case when c.category_id = 'FIRE' then 'Critical' when c.category_id in ('PLUMB', 'ELEC', 'MESS') then 'High' else 'Medium' end)::infra.priority,
              now() + make_interval(hours => c.default_sla_hours)
            from infra.maintenance_category c where c.category_id = ${item.category_id} returning ticket_id::int as ticket_id`)) as unknown as { ticket_id: number }[];
          ticket = tk?.ticket_id ?? null; if (ticket) tickets++;
        }
        await tx.execute(sql`insert into hostel.checklist_response (submission_id, item_no, space_id, answer, remarks, ticket_id, created_by)
          values (${s.submission_id}, ${a.item_no}, ${a.space_id ?? null}, ${a.answer}, ${a.remarks ?? null}, ${ticket}, ${user.id})`);
      }
      return { submission_id: s.submission_id, overall_status: overall, tickets };
    });
  }

  async submission(user: AuthUser, id: number) {
    const all = await this.checklists(user);
    const head = (all.submissions as { submission_id: number }[]).find((s) => s.submission_id === id);
    if (!head) throw new NotFoundException('Checklist not found');
    const answers = await this.dbs.rows(sql`select r.item_no::int as item_no, i.section, i.item_text, r.answer, r.remarks, r.ticket_id::int as ticket_id, t.status::text as ticket_status
      from hostel.checklist_response r join hostel.checklist_submission s using (submission_id) join hostel.checklist_item i on i.template_id = s.template_id and i.item_no = r.item_no
      left join infra.maintenance_ticket t on t.ticket_id = r.ticket_id where r.submission_id = ${id} order by r.item_no`);
    return { ...head, answers };
  }

  async review(user: AuthUser, id: number, dto: { overall_status: string; remarks?: string | null }) {
    const s = (await this.submission(user, id)) as unknown as { can_review: boolean; status: string };
    if (!s.can_review) throw new ForbiddenException('You do not review this checklist');
    if (s.status === 'Reviewed') throw new UnprocessableEntityException('Already reviewed');
    await this.run(user, sql`update hostel.checklist_submission set status = 'Reviewed', reviewed_by = ${user.id}, reviewed_at = now(), overall_status = ${dto.overall_status},
      review_remarks = ${dto.remarks ?? null}, updated_by = ${user.id} where submission_id = ${id} and submitted_by is distinct from ${user.id}`)
      .then((r) => { if (!r.length) throw new UnprocessableEntityException('You cannot sign your own checklist'); });
    return { ok: true };
  }

  /* ------------------------------------------------------------ grievances (not repairs) */

  async myGrievances(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    return this.dbs.rows(sql`select g.grievance_id::int as grievance_id, g.category, g.description, g.is_confidential, g.status, g.raised_at, g.action_taken, g.closed_at,
        initcap(st.full_name) as assigned_name from hostel.student_grievance g left join ref.staff_master st on st.staff_id = g.assigned_to
      where g.student_id = ${user.id} order by g.grievance_id desc`);
  }

  raise(user: AuthUser, dto: { student_id?: string; category: string; description: string; is_confidential: boolean }) {
    const sid = user.kind === 'student' ? user.id : dto.student_id;
    if (!sid) throw new UnprocessableEntityException('Choose the student');
    // ragging and safety always go to the heads only
    const conf = dto.is_confidential || ['Ragging', 'Safety'].includes(dto.category);
    return this.run<{ grievance_id: number }>(user, sql`insert into hostel.student_grievance (student_id, category, description, is_confidential, created_by)
      values (${sid}, ${dto.category}, ${dto.description}, ${conf}, ${user.id}) returning grievance_id::int as grievance_id`).then((r) => r[0]);
  }

  private grievanceScope(user: AuthUser) {
    const conf = user.roles.some((r) => CONFIDENTIAL_OK.includes(r));
    const all = user.roles.some((r) => ['admin', 'Dean_Students_Affairs'].includes(r));
    const place = all ? sql`true` : user.roles.includes('Floor_Warden') && !user.roles.some((r) => ['Warden', 'Chief_Warden', 'Director_Hostels', 'Room_Allotment', 'Office_Staff'].includes(r))
      ? sql`exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.status = 'Active' and a.facility_id = b.facility_id and (a.zone_id is null or a.zone_id = b.zone_id))`
      : facWhere('b.facility_id', null, user);
    return sql`(${conf} or not g.is_confidential) and (${place} or g.assigned_to = ${user.id})`;
  }

  async grievances(user: AuthUser, status?: string) {
    const rows = await this.dbs.rows(sql`select g.grievance_id::int as grievance_id, g.student_id, initcap(sm.full_name) as student_name, b.bed_label, b.hostel_name, g.category, g.description,
        g.is_confidential, g.status, g.raised_at, g.action_taken, g.closed_at, initcap(st.full_name) as assigned_name, g.assigned_to
      from hostel.student_grievance g join ref.student_master sm on sm.student_id = g.student_id left join hostel.v_bed b on b.student_id = g.student_id
      left join ref.staff_master st on st.staff_id = g.assigned_to
      where ${this.grievanceScope(user)} and (${status ?? null}::text is null or g.status = ${status ?? null} or (${status ?? null} = 'open' and g.status <> 'Closed'))
      order by (g.status = 'Closed'), (g.category in ('Ragging', 'Safety')) desc, g.raised_at desc limit 300`);
    const [n] = await this.dbs.rows(sql`select count(*) filter (where g.status = 'Open')::int as open, count(*) filter (where g.status = 'In_Review')::int as in_review,
        count(*) filter (where g.status = 'Escalated')::int as escalated, count(*) filter (where g.status = 'Closed' and g.closed_at > now() - interval '30 days')::int as closed_30
      from hostel.student_grievance g left join hostel.v_bed b on b.student_id = g.student_id where ${this.grievanceScope(user)}`);
    return { rows, counts: n };
  }

  /** Take it up, escalate it to the Chief Manager, or close it with what was done; the student is told. */
  async act(user: AuthUser, id: number, dto: { status: 'In_Review' | 'Escalated' | 'Closed'; action_taken?: string | null }) {
    if (dto.status === 'Closed' && !(dto.action_taken ?? '').trim()) throw new UnprocessableEntityException('Say what was done before closing');
    const [g] = await this.dbs.rows<{ grievance_id: number }>(sql`select g.grievance_id from hostel.student_grievance g left join hostel.v_bed b on b.student_id = g.student_id
      where g.grievance_id = ${id} and ${this.grievanceScope(user)}`);
    if (!g) throw new NotFoundException('Grievance not found');
    const rows = await this.run<{ student_id: string }>(user, sql`update hostel.student_grievance g set status = ${dto.status}, action_taken = coalesce(${dto.action_taken ?? null}, g.action_taken),
        assigned_to = case when ${dto.status} = 'Escalated' then (select a.staff_id from hostel.staff_space_assignment a join hostel.v_bed b on b.facility_id = a.facility_id
                                                                   where b.student_id = g.student_id and a.hostel_role = 'Chief_Warden' and a.status = 'Active' limit 1)
                           when g.assigned_to is null then ${user.kind === 'staff' ? user.id : null} else g.assigned_to end,
        closed_at = case when ${dto.status} = 'Closed' then now() end, updated_by = ${user.id}
      where g.grievance_id = ${id} and g.status <> 'Closed' returning g.student_id`);
    if (!rows.length) throw new UnprocessableEntityException('This grievance is already closed');
    const text = dto.status === 'Closed' ? `Your grievance is closed: ${dto.action_taken}` : dto.status === 'Escalated' ? 'Your grievance has gone to the Chief Manager.' : 'A warden is looking into your grievance.';
    await this.run(user, sql`insert into shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
      values ('Student', ${rows[0].student_id}, 'In_App', 'GRIEVANCE', 'Your grievance', ${text}, 'student_grievance', ${String(id)})`);
    return { ok: true };
  }
}
