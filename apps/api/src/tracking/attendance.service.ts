import { BadRequestException, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * Attendance register for wardens: each resident against each day, with planned absences (approved outings, sick leave)
 * and the night roll call. A Floor Warden sees the floors they are assigned to; other wardens the whole hostel.
 */
@Injectable()
export class AttendanceService {
  constructor(private dbs: DbService) {}

  private scope(user: AuthUser, facilityId: string) {
    return user.role === 'Floor_Warden'
      ? sql`and exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.hostel_role = 'Floor_Warden' and a.status = 'Active' and a.facility_id = ${facilityId} and (a.zone_id is null or a.zone_id = b.zone_id))`
      : sql``;
  }

  async register(user: AuthUser, facilityId: string, from: string, to: string) {
    if (!facilityId) throw new BadRequestException('facility_id is required');
    const students = await this.dbs.rows(sql`
      select sm.student_id, sm.full_name, sm.programme, b.space_id, b.subspace_id, b.room_code, b.zone_id, b.floor_name, cs.current_status
      from hostel.v_bed b join ref.student_master sm on sm.student_id = b.student_id left join hostel.student_current_status cs on cs.student_id = sm.student_id
      where b.facility_id = ${facilityId} and b.occupant_type = 'Student' ${this.scope(user, facilityId)}
      order by b.floor_no, b.room_code, b.bed_code`);
    const ids = students.map((s) => s.student_id as string);
    if (!ids.length) return { students, outings: [], sick: [], marks: [] };
    const list = sql`string_to_array(${ids.join(',')}, ',')`;
    const outings = await this.dbs.rows(sql`select o.student_id, o.outpass_id::int as outpass_id, o.outpass_no, o.destination, o.leave_from, o.return_by, o.status, o.outing_category
      from hostel.outpass o where o.student_id = any(${list}) and o.status::text not in ('Rejected', 'Cancelled') and o.leave_from::date <= ${to}::date and o.return_by::date >= ${from}::date`);
    const sick = await this.dbs.rows(sql`select l.student_id, l.sick_leave_id::int as sick_leave_id, l.illness_details, l.from_date, l.to_date, l.status
      from hostel.sick_leave l where l.student_id = any(${list}) and l.status::text not in ('Rejected', 'Cancelled') and l.from_date <= ${to}::date and l.to_date >= ${from}::date`);
    const marks = await this.dbs.rows(sql`select a.student_id, a.att_date, a.status, a.marked_by, a.remarks from hostel.night_attendance a where a.student_id = any(${list}) and a.att_date between ${from}::date and ${to}::date`);
    return { students, outings, sick, marks };
  }

  /** Night roll call. Absent with no pass and no sick leave raises a Not_Seen alert to the Floor Warden. */
  async mark(user: AuthUser, dto: { att_date: string; facility_id: string; marks: { student_id: string; status: 'Present' | 'Absent' | 'On_Pass' | 'Sick_Leave'; remarks?: string }[] }) {
    await this.dbs.run(user, async (tx) => {
      for (const m of dto.marks) {
        await tx.execute(sql`insert into hostel.night_attendance (student_id, att_date, status, facility_id, remarks, marked_by) values (${m.student_id}, ${dto.att_date}::date, ${m.status}::hostel.attendance_status, ${dto.facility_id}, ${m.remarks ?? null}, ${user.id})
          on conflict (student_id, att_date) do update set status = excluded.status, remarks = excluded.remarks, marked_by = excluded.marked_by, marked_at = now()`);
        // the night register and the night session stay the same
        await tx.execute(sql`insert into hostel.session_attendance (session_id, att_date, student_id, status, remarks, marked_by)
          select s.session_id, ${dto.att_date}::date, ${m.student_id}, ${m.status}::hostel.attendance_status, ${m.remarks ?? null}, ${user.id}
          from (select session_id from hostel.attendance_session where is_night order by session_id limit 1) s
          on conflict (session_id, att_date, student_id) do update set status = excluded.status, remarks = excluded.remarks, marked_by = excluded.marked_by, marked_at = now()`);
        if (m.status === 'Absent') {
          await tx.execute(sql`insert into hostel.hostel_alert (alert_type, student_id, facility_id, related_type, severity, assigned_to, created_by)
            select 'Not_Seen', ${m.student_id}, ${dto.facility_id}, 'night_attendance', 'Warning',
              (select a.staff_id from hostel.staff_space_assignment a join hostel.v_bed b on b.student_id = ${m.student_id}
                where a.facility_id = b.facility_id and a.hostel_role = 'Floor_Warden' and a.status = 'Active' and (a.zone_id is null or a.zone_id = b.zone_id) limit 1), ${user.id}
            where not exists (select 1 from hostel.hostel_alert a where a.student_id = ${m.student_id} and a.alert_type = 'Not_Seen' and a.status <> 'Closed' and a.raised_at::date = ${dto.att_date}::date)`);
        }
      }
    });
    return { saved: dto.marks.length };
  }
}
