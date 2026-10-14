import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

type Floor = { zone_id: string; floor_name: string; floor_no: number; facility_id: string; hostel_name: string; hostel_code: string };

/**
 * The Floor Manager's day in one call: the floors in their charge, every resident with tonight's state, and what needs
 * the Floor Manager today (roll call, sick visits, returns, alerts, check-ins, floor staff). A Warden or Chief Manager may
 * pass facility_id to see every floor of a hostel the same way.
 */
@Injectable()
export class FloorService {
  constructor(private dbs: DbService) {}

  private floors(user: AuthUser, facilityId?: string) {
    const scope = facilityId && user.role !== 'Floor_Warden'
      ? sql`z.facility_id = ${facilityId}`
      : sql`exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.hostel_role = 'Floor_Warden' and a.status = 'Active'
          and a.facility_id = z.facility_id and (a.zone_id is null or a.zone_id = z.zone_id))`;
    return this.dbs.rows<Floor>(sql`
      select z.zone_id, z.zone_name as floor_name, z.sequence_no::int as floor_no, z.facility_id, f.facility_name as hostel_name, hp.hostel_code
      from infra.zone z join infra.facility f on f.facility_id = z.facility_id join hostel.hostel_profile hp on hp.facility_id = z.facility_id
      where ${scope} and exists (select 1 from infra.space s where s.zone_id = z.zone_id and s.space_category = 'Hostel_Room')
      order by hp.hostel_code, z.sequence_no`);
  }

  async today(user: AuthUser, date: string, facilityId?: string) {
    const floors = await this.floors(user, facilityId);
    const zones = floors.map((f) => f.zone_id);
    if (!zones.length) return { date, floors: [], beds: [], alerts: [], sick: [], returning: [], checkins: [], staff: [] };
    const z = sql`string_to_array(${zones.join(',')}, ',')`;
    const beds = await this.dbs.rows(sql`
      select b.zone_id, b.space_id, b.room_code, b.subspace_id, b.bed_code, b.type_name, b.bed_status::text as bed_status, b.facility_id,
        b.student_id, sm.full_name, sm.programme,
        (select c.mobile_no from hostel.student_contact c where c.student_id = b.student_id and c.relation = 'Self' limit 1) as mobile,
        cs.current_status::text as current_status, na.status::text as mark, na.remarks as mark_remarks,
        (select o.outpass_no from hostel.outpass o where o.student_id = b.student_id and o.status in ('Approved','Out','Overdue')
           and o.leave_from::date <= ${date}::date and o.return_by::date >= ${date}::date limit 1) as on_pass,
        (select l.sick_leave_id::int from hostel.sick_leave l where l.student_id = b.student_id and l.status = 'Approved'
           and l.from_date <= ${date}::date and l.to_date >= ${date}::date limit 1) as on_sick
      from hostel.v_bed b
      left join ref.student_master sm on sm.student_id = b.student_id
      left join hostel.student_current_status cs on cs.student_id = b.student_id
      left join hostel.night_attendance na on na.student_id = b.student_id and na.att_date = ${date}::date
      where b.zone_id = any(${z}) order by b.floor_no, b.room_code, b.bed_code`);
    const onMyFloors = sql`exists (select 1 from hostel.v_bed vb where vb.student_id = x.student_id and vb.zone_id = any(${z}))`;
    const alerts = await this.dbs.rows(sql`
      select x.alert_id::int as alert_id, x.alert_type::text as alert_type, x.student_id, sm.full_name, x.raised_at, x.severity::text as severity, x.status::text as status, x.action_taken
      from hostel.hostel_alert x left join ref.student_master sm on sm.student_id = x.student_id
      where x.status::text <> 'Closed' and (x.assigned_to = ${user.id} or ${onMyFloors}) order by x.raised_at desc limit 50`);
    const sick = await this.dbs.rows(sql`
      select x.sick_leave_id::int as sick_leave_id, x.student_id, sm.full_name, x.illness_details, x.from_date, x.to_date, x.status::text as status,
        x.visited_at, x.visit_remarks, x.room_meals_required, (select vb.room_code from hostel.v_bed vb where vb.student_id = x.student_id limit 1) as room_code
      from hostel.sick_leave x join ref.student_master sm on sm.student_id = x.student_id
      where ${onMyFloors} and x.status in ('Applied','Recommended','Approved') and x.to_date >= ${date}::date order by x.visited_at nulls first, x.from_date`);
    const returning = await this.dbs.rows(sql`
      select x.outpass_id::int as outpass_id, x.outpass_no, x.student_id, sm.full_name, x.destination, x.leave_from, x.return_by, x.status::text as status
      from hostel.outpass x join ref.student_master sm on sm.student_id = x.student_id
      where ${onMyFloors} and x.status in ('Approved','Out','Overdue') and (x.return_by::date = ${date}::date or x.leave_from::date = ${date}::date or x.status = 'Overdue') order by x.return_by`);
    const checkins = await this.dbs.rows(sql`
      select r.registration_id::int as registration_id, r.student_id, sm.full_name, sm.programme, o.subspace_id, vb.room_code, r.fee_check_status
      from hostel.hostel_registration r join ref.student_master sm on sm.student_id = r.student_id
      join hostel.room_offer o on o.registration_id = r.registration_id and o.student_decision = 'Accepted'
      join hostel.v_bed vb on vb.subspace_id = o.subspace_id
      where r.status = 'Confirmed' and vb.zone_id = any(${z}) order by r.applied_on`);
    const staff = await this.dbs.rows(sql`
      select d.duty_id::int as duty_id, d.zone_id, d.space_id, s.space_code, d.hostel_role, d.shift::text as shift, d.source::text as source, d.staff_id, st.full_name, st.mobile_no,
        att.status::text as att_status, d.facility_id
      from hostel.daily_duty d left join ref.staff_master st on st.staff_id = d.staff_id left join infra.space s on s.space_id = d.space_id
      left join hostel.staff_attendance att on att.staff_id = d.staff_id and att.att_date = d.duty_date
      where d.duty_date = ${date}::date and d.zone_id = any(${z}) order by d.zone_id, d.hostel_role`);
    return { date, floors, beds, alerts, sick, returning, checkins, staff };
  }
}
