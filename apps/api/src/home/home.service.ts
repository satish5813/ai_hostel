import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

type Need = { key: string; count: number; title: string; sub: string; route: string };

/**
 * The apps launcher (home of every staff member): the figures in the hero, what needs the person today,
 * a count per screen for the badges, and the state of the systems the hostel talks to.
 * Every number is counted live; a role sees only the items its screens can act on.
 */
@Injectable()
export class HomeService {
  constructor(private dbs: DbService) {}

  async summary(user: AuthUser, facilityId?: string) {
    const f = facilityId ?? null;
    const has = (...r: string[]) => r.some((x) => user.roles.includes(x) || user.role === x);
    const [h] = await this.dbs.rows<Record<string, number>>(sql`select
      (select count(*)::int from hostel.v_bed b where ${facWhere('b.facility_id', f, user)}) as beds,
      (select count(*)::int from hostel.v_bed b where b.bed_status = 'Occupied' and ${facWhere('b.facility_id', f, user)}) as occupied,
      (select count(*)::int from hostel.v_bed b where b.bed_status = 'Vacant' and not b.is_blocked and b.room_status <> 'Under_Maintenance' and ${facWhere('b.facility_id', f, user)}) as open_beds,
      (select count(distinct b.space_id)::int from hostel.v_bed b where b.is_blocked and ${facWhere('b.facility_id', f, user)}) as blocked_rooms,
      (select count(*)::int from hostel.student_current_status s join hostel.v_bed b on b.student_id = s.student_id where s.current_status in ('Outside_On_Pass','Overdue') and ${facWhere('b.facility_id', f, user)}) as on_pass,
      (select count(*)::int from hostel.outpass o where o.status = 'Overdue' or (o.status = 'Out' and o.return_by < now())) as overdue,
      (select count(distinct a.staff_id)::int from hostel.staff_space_assignment a where a.status = 'Active' and ${facWhere('a.facility_id', f, user)}) as staff_total,
      (select count(distinct t.staff_id)::int from hostel.staff_attendance t where t.att_date = current_date and t.status in ('Present','Half_Day') and ${facWhere('t.facility_id', f, user)}) as staff_present,
      (select count(*)::int from hostel.hostel_allocation a join hostel.v_bed b on b.subspace_id = a.subspace_id where a.status = 'Active' and a.occupant_type = 'Student' and ${facWhere('b.facility_id', f, user)}) as residents,
      (select count(*)::int from hostel.hostel_registration r where r.status in ('Fee_Paid','Waitlisted') and ${facWhere('r.facility_id', f, user)}) as waiting_room,
      (select count(*)::int from hostel.hostel_registration r where r.status = 'Confirmed' and r.fee_check_status = 'Pending' and ${facWhere('r.facility_id', f, user)}) as fee_checks,
      (select count(*)::int from hostel.hostel_registration r where r.status = 'Confirmed' and r.fee_check_status = 'Verified' and r.cw_status = 'Approved' and ${facWhere('r.facility_id', f, user)}) as ready_checkin,
      (select count(*)::int from hostel.hostel_registration r where r.status = 'Confirmed' and r.fee_check_status = 'Verified' and r.cw_status = 'Pending' and ${facWhere('r.facility_id', f, user)}) as cw_approvals,
      (select count(*)::int from hostel.daily_duty d where d.duty_date = current_date and d.source = 'Open' and ${facWhere('d.facility_id', f, user)}) as open_places,
      (select count(*)::int from hostel.hostel_alert a where a.status::text <> 'Closed' and ${facWhere('a.facility_id', f, user)}) as alerts,
      (select count(*)::int from hostel.hostel_alert a where a.status::text <> 'Closed' and a.severity::text = 'Critical' and ${facWhere('a.facility_id', f, user)}) as critical,
      (select count(*)::int from hostel.room_meter m where m.status::text = 'Faulty') as faulty_meters,
      (select count(*)::int from infra.maintenance_ticket t where t.status in ('Open','Assigned','In_Progress','Reopened') and ${facWhere('t.facility_id', f, user)}) as open_tickets,
      (select count(*)::int from infra.maintenance_ticket t where t.status = 'Resolved' and ${facWhere('t.facility_id', f, user)}) as tickets_to_confirm,
      (select count(*)::int from hostel.access_request r where r.status = 'Pending') as access_pending,
      (select count(*)::int from hostel.sick_leave l where l.status = 'Approved' and l.visited_at is null and l.to_date >= current_date) as sick_visits`);
    const needs: Need[] = [];
    const push = (ok: boolean, key: string, count: number, title: string, sub: string, route: string) => { if (ok && count > 0) needs.push({ key, count, title, sub, route }); };
    const wardens = has('Chief_Warden', 'Warden', 'Assistant_Warden', 'Hostel_Incharge', 'Director_Hostels');
    const office = has('Office_Staff', 'Room_Allotment', 'Chief_Warden', 'Hostel_Incharge');
    push(wardens, 'fee', h.fee_checks, `${h.fee_checks} fee verification${h.fee_checks > 1 ? 's' : ''} waiting`, 'Rooms and allotment · Allotment approvals', '/allotment-approvals');
    push(has('Chief_Warden', 'Director_Hostels'), 'cw', h.cw_approvals, `${h.cw_approvals} allotment${h.cw_approvals > 1 ? 's' : ''} to approve`, 'Rooms and allotment · Allotment approvals', '/allotment-approvals');
    push(office, 'wait', h.waiting_room, `${h.waiting_room} student${h.waiting_room > 1 ? 's' : ''} waiting for a room`, 'Rooms and allotment · Allotment desk', '/allotment');
    push(office || has('Floor_Warden'), 'checkin', h.ready_checkin, `${h.ready_checkin} ready to check in`, 'Rooms and allotment · Check-in', '/check-in');
    push(wardens || has('Housekeeping_Supervisor'), 'roster', h.open_places, `${h.open_places} place${h.open_places > 1 ? 's' : ''} with nobody today`, 'People and attendance · Duty roster', '/duty-roster');
    push(wardens || has('Floor_Warden', 'Security_Officer', 'Security_Guard'), 'alerts', h.critical || h.alerts, h.critical ? `${h.critical} critical alert${h.critical > 1 ? 's' : ''} open` : `${h.alerts} alert${h.alerts > 1 ? 's' : ''} open`, 'Tracking and gate · Alerts', '/alerts');
    push(wardens || has('Floor_Warden', 'Security_Officer'), 'access', h.access_pending, `${h.access_pending} out-of-hours entr${h.access_pending > 1 ? 'ies' : 'y'} to decide`, 'Tracking and gate · Access control', '/access');
    push(wardens || has('Floor_Warden', 'Maintenance_Supervisor'), 'repairs', h.tickets_to_confirm || h.open_tickets, h.tickets_to_confirm ? `${h.tickets_to_confirm} repair${h.tickets_to_confirm > 1 ? 's' : ''} to confirm` : `${h.open_tickets} open repair${h.open_tickets > 1 ? 's' : ''}`, 'Maintenance · Floor rounds and repairs', '/maintenance');
    push(has('Floor_Warden'), 'sick', h.sick_visits, `${h.sick_visits} sick student${h.sick_visits > 1 ? 's' : ''} to visit`, 'Outing and leave · Sick leave', '/sick-leave-approvals');
    push(has('Maintenance_Supervisor', 'Accounts_Section', 'Chief_Warden', 'Electrician'), 'meters', h.faulty_meters, `${h.faulty_meters} faulty meter${h.faulty_meters > 1 ? 's' : ''}`, 'Electricity · Meters', '/meters');

    const badges: Record<string, number> = {
      '/fee-checks': h.fee_checks, '/allotment-approvals': h.fee_checks + h.cw_approvals, '/allotment': h.waiting_room, '/check-in': h.ready_checkin, '/duty-roster': h.open_places, '/alerts': h.alerts,
      '/access': h.access_pending, '/maintenance': h.tickets_to_confirm + h.open_tickets, '/meters': h.faulty_meters, '/sick-leave-approvals': h.sick_visits,
    };
    const [sys] = await this.dbs.rows<{ erp_sync: string | null; collected_today: number; failed_today: number; registrations_today: number; year: string | null }>(sql`select
      (select max(received_at)::text from shared.import_batch where source::text in ('ERP_Student','ERP_Staff')) as erp_sync,
      (select coalesce(sum(amount), 0)::float from hostel.fee_receipt where gateway_status = 'Success' and paid_on::date = current_date) as collected_today,
      (select count(*)::int from hostel.fee_receipt where gateway_status = 'Failed' and paid_on::date = current_date) as failed_today,
      (select count(*)::int from hostel.hostel_registration where applied_on::date = current_date) as registrations_today,
      (select academic_year from hostel.academic_year where is_current limit 1) as year`);
    return {
      year: sys.year,
      hero: { beds: h.beds, occupied: h.occupied, on_pass: h.on_pass, staff_present: h.staff_present, staff_total: h.staff_total },
      stats: { open_beds: h.open_beds, blocked_rooms: h.blocked_rooms, overdue: h.overdue, residents: h.residents, alerts: h.alerts, faulty_meters: h.faulty_meters, open_tickets: h.open_tickets },
      needs, badges,
      systems: { erp_sync: sys.erp_sync, collected_today: sys.collected_today, failed_today: sys.failed_today, registrations_today: sys.registrations_today, gateway_live: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) },
    };
  }
}
