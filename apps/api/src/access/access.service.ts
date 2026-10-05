import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

type Verdict = { verdict: 'Allowed' | 'Allowed_Alerted' | 'Approval_Needed' | 'Denied'; reason: string };
export type PolicyDto = { who: string; open_from?: string | null; open_to?: string | null; outside_hours: string; pass_to_exit: boolean; proof: string[]; approver_role?: string | null; photo_on_entry: boolean; methods: string[] };

/**
 * Access control for every space (TRK-09). Each capture point accepts some methods (QR, face, thumb, card, by hand)
 * and carries a policy: who may pass, when, with what proof, whether an outing pass or an approval is needed.
 * A scan is judged by hostel.fn_access_check; the verdict and reason are kept on the movement event. Refused scans
 * are recorded but do not move the student. Out-of-hours entry that needs approval opens a request for the approver.
 */
@Injectable()
export class AccessService {
  constructor(private dbs: DbService) {}

  points() {
    return this.dbs.rows(sql`
      select p.point_id::int as point_id, p.point_name, p.point_type::text as point_type, p.facility_id, f.facility_name as hostel_name, p.zone_id, z.zone_name,
        p.device_type::text as device_type, p.device_ref, p.status::text as status, p.methods::text[] as methods,
        pol.who, to_char(pol.open_from, 'HH24:MI') as open_from, to_char(pol.open_to, 'HH24:MI') as open_to, pol.outside_hours, pol.pass_to_exit, pol.proof::text[] as proof,
        pol.approver_role, pol.photo_on_entry,
        (select count(*)::int from hostel.movement_event e where e.point_id = p.point_id and e.event_at::date = current_date and coalesce(e.verdict::text, 'Allowed') like 'Allowed%') as allowed_today,
        (select count(*)::int from hostel.movement_event e where e.point_id = p.point_id and e.event_at::date = current_date and e.verdict = 'Denied') as denied_today,
        (select count(*)::int from hostel.access_request r where r.point_id = p.point_id and r.status = 'Pending') as pending
      from hostel.capture_point p left join infra.facility f on f.facility_id = p.facility_id left join infra.zone z on z.zone_id = p.zone_id
      left join hostel.access_policy pol on pol.point_id = p.point_id
      order by array_position(array['Campus_Gate','Hostel_Gate','Room_Corridor','Mess','Library','Gym','Facility','Academic_Block']::varchar[], p.point_type::text), p.point_name`);
  }

  async setPolicy(user: AuthUser, pointId: number, dto: PolicyDto) {
    if (!dto.proof.every((m) => dto.methods.includes(m))) throw new UnprocessableEntityException('Every proof must be a method this point accepts');
    return this.dbs.run(user, async (tx) => {
      await tx.execute(sql`update hostel.capture_point set methods = ${`{${dto.methods.join(',')}}`}::hostel.capture_method[], updated_by = ${user.id}, updated_at = now() where point_id = ${pointId}`);
      await tx.execute(sql`insert into hostel.access_policy (point_id, who, open_from, open_to, outside_hours, pass_to_exit, proof, approver_role, photo_on_entry, updated_at, updated_by)
        values (${pointId}, ${dto.who}, ${dto.open_from || null}::time, ${dto.open_to || null}::time, ${dto.outside_hours}, ${dto.pass_to_exit}, ${`{${dto.proof.join(',')}}`}::hostel.capture_method[], ${dto.approver_role || null}, ${dto.photo_on_entry}, now(), ${user.id})
        on conflict (point_id) do update set who = excluded.who, open_from = excluded.open_from, open_to = excluded.open_to, outside_hours = excluded.outside_hours, pass_to_exit = excluded.pass_to_exit,
          proof = excluded.proof, approver_role = excluded.approver_role, photo_on_entry = excluded.photo_on_entry, updated_at = now(), updated_by = excluded.updated_by`);
      return { point_id: pointId };
    });
  }

  async check(studentId: string, pointId: number, direction: 'In' | 'Out', method: string, at?: string): Promise<Verdict & { student?: unknown }> {
    const [v] = await this.dbs.rows<Verdict>(sql`select verdict::text as verdict, reason from hostel.fn_access_check(${studentId}, ${pointId}, ${direction}::hostel.direction, ${method}::hostel.capture_method, coalesce(${at ?? null}::timestamptz, now()))`);
    const [st] = await this.dbs.rows(sql`select sm.student_id, sm.full_name, sm.programme, b.hostel_code, b.room_code, b.floor_name from ref.student_master sm
      left join hostel.hostel_allocation a on a.student_id = sm.student_id and a.status = 'Active' left join hostel.v_bed b on b.subspace_id = a.subspace_id where sm.student_id = ${studentId}`);
    if (!st) throw new NotFoundException('No student with this ID');
    return { ...v, student: st };
  }

  /** A real scan from a device or the guard's phone: judged, recorded, and an approval request opened when needed. */
  async scan(user: AuthUser, dto: { student_id: string; point_id: number; direction: 'In' | 'Out'; method: string; match_confidence?: number; reason?: string }) {
    const v = await this.check(dto.student_id, dto.point_id, dto.direction, dto.method);
    return this.dbs.run(user, async (tx) => {
      const source = dto.method === 'Face' ? 'Camera' : dto.method === 'Manual' ? 'Manual' : 'Scan';
      await tx.execute(sql`insert into hostel.movement_event (student_id, point_id, direction, event_at, source, match_confidence, recorded_by, method, verdict, verdict_reason)
        values (${dto.student_id}, ${dto.point_id}, ${dto.direction}::hostel.direction, now(), ${source}::hostel.event_source, ${dto.match_confidence ?? null}, ${user.id}, ${dto.method}::hostel.capture_method, ${v.verdict}::hostel.access_verdict, ${v.reason})`);
      let request = null;
      if (v.verdict === 'Approval_Needed') {
        [request] = (await tx.execute(sql`insert into hostel.access_request (student_id, point_id, reason)
          select ${dto.student_id}, ${dto.point_id}, ${dto.reason ?? 'At the gate out of hours'}
          where not exists (select 1 from hostel.access_request r where r.student_id = ${dto.student_id} and r.point_id = ${dto.point_id} and r.status = 'Pending')
          returning request_id::int as request_id`)) as unknown as unknown[];
      }
      if (v.verdict === 'Approval_Needed' || v.verdict === 'Allowed_Alerted') {
        await tx.execute(sql`insert into hostel.hostel_alert (alert_type, student_id, facility_id, related_type, related_id, severity, assigned_to, created_by)
          select 'Out_Of_Hours', ${dto.student_id}, coalesce((select facility_id from hostel.fn_student_stay(${dto.student_id})), p.facility_id), 'capture_point', p.point_id, 'Warning',
            hostel.fn_find_approver(${dto.student_id}, 'Floor_Warden'), ${user.id} from hostel.capture_point p where p.point_id = ${dto.point_id}`);
      }
      return { ...v, request };
    });
  }

  /** Requests the caller can decide: their role is the point's approver and the student lives in their charge. */
  requests(user: AuthUser, all = false) {
    return this.dbs.rows(sql`
      select r.request_id::int as request_id, r.student_id, sm.full_name, b.room_code, b.hostel_code, p.point_name, r.reason, r.requested_at, r.valid_until, r.status, r.remarks, pol.approver_role
      from hostel.access_request r join hostel.capture_point p on p.point_id = r.point_id join hostel.access_policy pol on pol.point_id = r.point_id
      join ref.student_master sm on sm.student_id = r.student_id left join hostel.fn_student_stay(r.student_id) st on true left join hostel.v_bed b on b.subspace_id = st.subspace_id
      where (${all} or r.status = 'Pending') and r.requested_at > now() - interval '2 days'
        and (${user.roles.includes('Chief_Warden') || user.roles.includes('Security_Officer')}
          or exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.status = 'Active' and a.hostel_role = coalesce(pol.approver_role, 'Warden')
                     and a.facility_id = st.facility_id and (a.zone_id is null or a.zone_id = st.zone_id)))
      order by r.requested_at desc`);
  }

  async decide(user: AuthUser, id: number, approve: boolean, remarks?: string) {
    if (!approve && !remarks) throw new UnprocessableEntityException('Say why the request is refused');
    const mine = (await this.requests(user)).some((r) => r.request_id === id);
    if (!mine) throw new ForbiddenException('This request is not for you to decide');
    return this.dbs.run(user, (tx) => tx.execute(sql`update hostel.access_request set status = ${approve ? 'Approved' : 'Rejected'}, decided_by = ${user.id}, decided_at = now(), remarks = ${remarks ?? null},
      valid_until = greatest(valid_until, now() + interval '1 hour') where request_id = ${id} and status = 'Pending'`)).then(() => ({ request_id: id }));
  }

  /** Recent scans, newest first, with the verdict and why. */
  log(pointId?: number) {
    return this.dbs.rows(sql`select e.event_id::text as event_id, e.event_at, e.direction::text as direction, e.method::text as method, e.verdict::text as verdict, e.verdict_reason, e.match_confidence::float as confidence,
        sm.full_name, e.student_id, p.point_name
      from hostel.movement_event e join hostel.capture_point p on p.point_id = e.point_id left join ref.student_master sm on sm.student_id = e.student_id
      where (${pointId ?? null}::bigint is null or e.point_id = ${pointId ?? null}) and e.event_at > now() - interval '7 days' order by e.event_at desc limit 100`);
  }

  /** Enrolment of residents per hostel: who has a card, a face or a thumb template on the devices. */
  enrolment(facilityId?: string) {
    return this.dbs.rows(sql`select b.hostel_code, sm.student_id, sm.full_name, b.room_code,
        bool_or(e.method = 'Card' and e.status = 'Active') as card, bool_or(e.method = 'Face' and e.status = 'Active') as face, bool_or(e.method = 'Thumb' and e.status = 'Active') as thumb,
        exists (select 1 from hostel.tracking_consent c where c.student_id = sm.student_id and c.withdrawn_on is null) as consent
      from hostel.v_bed b join ref.student_master sm on sm.student_id = b.student_id left join hostel.biometric_enrolment e on e.student_id = sm.student_id
      where b.occupant_type = 'Student' and (${facilityId ?? null}::varchar is null or b.facility_id = ${facilityId ?? null})
      group by b.hostel_code, sm.student_id, sm.full_name, b.room_code, b.floor_no order by b.hostel_code, b.floor_no, b.room_code`);
  }

  enrol(user: AuthUser, dto: { student_id: string; method: string; template_ref: string }) {
    return this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.biometric_enrolment (student_id, method, template_ref, enrolled_by) values (${dto.student_id}, ${dto.method}::hostel.capture_method, ${dto.template_ref}, ${user.id})
      on conflict (student_id, method) do update set template_ref = excluded.template_ref, enrolled_on = now(), enrolled_by = excluded.enrolled_by, status = 'Active'`)).then(() => ({ enrolled: true }));
  }
}
