import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * Screens every signed-in person has (Roles, Screens and Access Rights, section 1):
 *   GEN-01 My profile and contacts, GEN-02 Notifications. GEN-03 My approvals lives in ApprovalsService.
 */
@Injectable()
export class GeneralService {
  constructor(private dbs: DbService) {}

  /** GEN-01 for staff and parents (students use /students/:id, which carries every ERP attribute). */
  async profile(user: AuthUser) {
    if (user.kind === 'student') return { kind: 'student', student_id: user.id };
    if (user.kind === 'parent') {
      const contactId = Number(user.id.replace('contact:', ''));
      const [c] = await this.dbs.rows(sql`
        select c.contact_id, c.relation, c.contact_name, c.mobile_no, c.is_verified, c.is_outpass_approver,
               sm.student_id, sm.full_name as student_name, sm.programme, st.facility_id, st.space_id, st.subspace_id, hp.hostel_code
        from hostel.student_contact c join ref.student_master sm on sm.student_id = c.student_id
        left join hostel.fn_student_stay(c.student_id) st on true left join hostel.hostel_profile hp on hp.facility_id = st.facility_id
        where c.contact_id = ${contactId}`);
      if (!c) throw new NotFoundException('Contact not found');
      return { kind: 'parent', ...c };
    }
    const [s] = await this.dbs.rows(sql`
      select sm.staff_id, sm.salutation, sm.full_name, sm.gender, sm.designation, sm.staff_type, sm.dept_code, d.dept_name, sm.campus_code,
             sm.official_email, sm.mobile_no, sm.joining_date, sm.status, sm.blood_group,
             (select jsonb_agg(jsonb_build_object('assignment_id', a.assignment_id, 'hostel_role', a.hostel_role, 'facility_id', a.facility_id, 'hostel_name', f.facility_name,
                      'zone_id', a.zone_id, 'floor_name', z.zone_name, 'space_id', a.space_id, 'shift', a.shift, 'from_date', a.from_date, 'show_on_qr', a.show_on_qr) order by a.from_date desc)
                from hostel.staff_space_assignment a left join infra.facility f on f.facility_id = a.facility_id left join infra.zone z on z.zone_id = a.zone_id
               where a.staff_id = sm.staff_id and a.status = 'Active') as assignments,
             (select jsonb_agg(jsonb_build_object('role_code', ur.role_code, 'name', r.name, 'scope_dept', ur.scope_dept, 'granted_on', ur.granted_on, 'approval_ref', ur.approval_ref))
                from portal.app_user u join portal.user_role ur on ur.user_id = u.user_id join portal.role r on r.role_code = ur.role_code where u.staff_id = sm.staff_id) as roles
      from ref.staff_master sm left join ref.department d on d.dept_code = sm.dept_code
      where sm.staff_id = ${user.id}`);
    if (!s) throw new NotFoundException('Staff record not found in the ERP');
    return { kind: 'staff', ...s, session_role: user.role };
  }

  /** GEN-02: messages addressed to the person (SMS/WhatsApp/e-mail/app, whatever the channel). */
  notifications(user: AuthUser) {
    const where = user.kind === 'student' ? sql`n.student_id = ${user.id}`
      : user.kind === 'parent' ? sql`n.contact_id = ${Number(user.id.replace('contact:', ''))}`
      : sql`n.staff_id = ${user.id}`;
    return this.dbs.rows(sql`
      select n.notification_id::int as notification_id, n.channel, n.template_code, n.subject, n.body, n.related_type, n.related_id,
             n.queued_at, n.sent_at, n.delivery_status
      from shared.notification n where ${where} order by n.queued_at desc limit 200`);
  }

  /** RPT-07 Occupancy, fees and dues. Each opening of a report is logged (rule: reports are read-only, openings logged). */
  async reportOccupancyFeesDues(user: AuthUser) {
    const rows = await this.dbs.rows(sql`select * from hostel.v_rpt_occupancy_fees_dues order by hostel_code`);
    const dues = await this.dbs.rows(sql`
      select d.student_id, sm.full_name, hp.hostel_code, d.fee_head, d.instalment_no, d.amount_due, d.amount_paid, d.due_date, d.status
      from hostel.fee_demand d join ref.student_master sm on sm.student_id = d.student_id
      left join hostel.hostel_registration r on r.student_id = d.student_id and r.status not in ('Cancelled','Vacated')
      left join hostel.hostel_profile hp on hp.facility_id = r.facility_id
      where d.status in ('Overdue','Pending','Part_Paid') order by d.due_date limit 500`);
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into shared.audit_log (kind, outcome, actor, role_code, table_name, row_key, detail)
      values ('report opened', 'allowed', ${user.id}, ${user.role}, 'hostel.v_rpt_occupancy_fees_dues', 'RPT-07', '{}'::jsonb)`)).catch(() => undefined);
    return { hostels: rows, open_demands: dues };
  }
}
